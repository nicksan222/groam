"""Launcher regression tests: no live provider calls, tools, or user sessions."""
import argparse
import contextlib
import importlib.util
import io
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

SPEC = importlib.util.spec_from_file_location('groam_agents', Path(__file__).with_name('agents.py'))
launcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(launcher)


def options(**changes):
    values = dict(command='up', roles=[], session=None, plugin=False,
                  fresh=False, no_attach=True, dry_run=False, unattended=False)
    return argparse.Namespace(**(values | changes))


class FleetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()
        self.addCleanup(self.output.__exit__, None, None, None)

    def fleet(self, **changes):
        fleet = launcher.Fleet(options(**changes))
        fleet.state = Path(self.temp.name) / 'state'
        self.addCleanup(fleet.unlock)
        return fleet

    def transport(self, fleet, owned=(), elsewhere=(), existing=True):
        """Emulate Herdr's pinned JSON envelope, without launching processes."""
        fleet.doctor = Mock()
        fleet.ensure_server = Mock()
        fleet.validate_container = Mock()
        fleet.server_running = Mock(return_value=True)
        fleet.herdr_command = Mock(return_value=subprocess.CompletedProcess([], 0, '', ''))
        workspaces = []
        if existing:
            workspaces.append(dict(workspace_id='ours', label=fleet.workspace,
                                   worktree=dict(checkout_path=str(launcher.REPO))))
        agents = [dict(name=name, workspace_id='ours', pane_id=f'pane-{name}') for name in owned]
        agents += [dict(name=name, workspace_id='other', pane_id=f'other-{name}') for name in elsewhere]

        def response(*arguments):
            if arguments == ('workspace', 'list'):
                return {'result': {'workspaces': workspaces}}
            if arguments == ('agent', 'list'):
                return {'result': {'agents': agents}}
            if arguments[:2] in [('workspace', 'create'), ('tab', 'create')]:
                return {'result': {'workspace': {'workspace_id': 'ours'},
                                   'tab': {'tab_id': 'new-tab'},
                                   'root_pane': {'pane_id': 'new-pane'}}}
            self.fail(f'unexpected transport command: {arguments}')

        fleet.herdr_json = Mock(side_effect=response)
        fleet.start_role = Mock()
        return fleet

    def test_regular_roster_and_team_selector(self):
        fleet = self.fleet(roles=['team', 'qa'])
        names = [role for role, _ in fleet.selected_roles()]
        self.assertEqual(names, ['lead', 'developer', 'pm', 'qa', 'traveler', 'reviewer', 'pushback'])
        self.assertEqual(fleet.maximum, 8)

    def test_invalid_selectors_and_sessions_fail_before_transport(self):
        for changes in [dict(roles=['missing']), dict(session='../escape'),
                        dict(session=''), dict(fresh=True, roles=['qa']),
                        dict(command='reset', roles=['qa'])]:
            with self.subTest(changes=changes), self.assertRaises(launcher.LauncherError):
                self.fleet(**changes)

    def test_dry_run_has_no_state_or_provider_calls(self):
        fleet = self.fleet(dry_run=True)
        fleet.doctor = Mock(side_effect=AssertionError('doctor invoked'))
        fleet.up()
        self.assertFalse(fleet.state.exists())
        fleet.doctor.assert_not_called()

    def test_reuse_existing_conversations(self):
        fleet = self.transport(self.fleet(), owned=self.fleet().defaults)
        fleet.up()
        fleet.start_role.assert_not_called()
        self.assertIsNone(fleet.lockfile)
        self.assertFalse(any(call.args[:2] == ('workspace', 'close')
                             for call in fleet.herdr_command.call_args_list))

    def test_start_only_missing_roles(self):
        fleet = self.transport(self.fleet(roles=['qa', 'traveler']), owned=['qa'])
        fleet.up()
        fleet.start_role.assert_called_once_with('traveler', 'build', 'new-pane')

    def test_first_start_creates_workspace_at_checkout(self):
        fleet = self.transport(self.fleet(roles=['qa']), existing=False)
        fleet.up()
        create = next(call for call in fleet.herdr_json.call_args_list
                      if call.args[:2] == ('workspace', 'create'))
        self.assertIn(str(launcher.REPO), create.args)
        self.assertIn('--no-focus', create.args)
        fleet.start_role.assert_called_once_with('qa', 'build', 'new-pane')

    def test_incremental_starts_cannot_bypass_cap(self):
        fleet = self.fleet(roles=['scenario', 'pr-maker'])
        self.transport(fleet, owned=fleet.defaults)
        with self.assertRaisesRegex(launcher.LauncherError, 'MAX_AGENTS'):
            fleet.up()
        fleet.start_role.assert_not_called()
        fleet.herdr_command.assert_not_called()

    def test_name_collision_cannot_modify_another_workspace(self):
        fleet = self.transport(self.fleet(roles=['qa']), elsewhere=['qa'])
        with self.assertRaisesRegex(launcher.LauncherError, 'another workspace'):
            fleet.up()
        fleet.herdr_command.assert_not_called()

    def test_workspace_must_belong_to_current_checkout(self):
        fleet = self.fleet()
        for worktree in [None, {'checkout_path': '/different-checkout'}]:
            fleet.herdr_json = Mock(return_value={'result': {'workspaces': [
                dict(workspace_id='foreign', label=fleet.workspace, worktree=worktree)]}})
            with self.assertRaisesRegex(launcher.LauncherError, 'not this checkout'):
                fleet.workspace_id()

    def test_duplicate_workspace_label_is_rejected(self):
        fleet = self.fleet()
        fleet.herdr_json = Mock(return_value={'result': {'workspaces': [
            dict(workspace_id=name, label=fleet.workspace) for name in ['a', 'b']]}})
        with self.assertRaisesRegex(launcher.LauncherError, 'duplicate'):
            fleet.workspace_id()

    def test_reset_and_fresh_clear_only_task_checkpoint(self):
        for fresh in [False, True]:
            fleet = self.transport(self.fleet(fresh=fresh), owned=['lead'])
            fleet.state.mkdir(parents=True, exist_ok=True)
            (fleet.state / 'task.txt').write_text('old task')
            (fleet.state / 'keep.txt').write_text('keep report')
            fleet.up(reset=not fresh)
            self.assertFalse((fleet.state / 'task.txt').exists())
            self.assertTrue((fleet.state / 'keep.txt').exists())
            fleet.herdr_command.assert_any_call('workspace', 'close', 'ours')
            self.assertEqual(fleet.start_role.call_count, 7)

    def test_failed_start_closes_only_its_new_pane(self):
        fleet = self.transport(self.fleet(roles=['qa']))
        fleet.start_role.side_effect = launcher.LauncherError('failed')
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(launcher.LauncherError):
            fleet.up()
        fleet.herdr_command.assert_any_call('pane', 'close', 'new-pane', check=False)
        self.assertFalse(any(call.args[:2] == ('workspace', 'close')
                             for call in fleet.herdr_command.call_args_list))

    def test_stop_selected_agent_ignores_foreign_panes(self):
        fleet = self.transport(self.fleet(command='down', roles=['qa']),
                               owned=['qa'], elsewhere=['qa'])
        fleet.down()
        fleet.herdr_command.assert_called_once_with('pane', 'close', 'pane-qa')

    def test_stop_whole_team_closes_only_owned_workspace(self):
        fleet = self.transport(self.fleet(command='down'))
        fleet.down()
        fleet.herdr_command.assert_called_once_with('workspace', 'close', 'ours')

    def test_lock_is_private_and_exclusive(self):
        first, second = self.fleet(), self.fleet()
        first.lock()
        self.assertEqual(first.state.stat().st_mode & 0o777, 0o700)
        self.assertEqual((first.state / 'launcher.lock').stat().st_mode & 0o777, 0o600)
        with self.assertRaisesRegex(launcher.LauncherError, 'another launcher'):
            second.lock()
        first.unlock()
        second.unlock()
        second.lock()

    def test_role_prompt_is_private_and_permissions_are_opt_in(self):
        for unattended in [False, True]:
            fleet = self.fleet(roles=['qa'], unattended=unattended)
            fleet.lock()
            fleet.herdr_command = Mock()
            fleet.start_role('qa', 'build', 'pane')
            arguments = fleet.herdr_command.call_args.args
            self.assertEqual('--dangerously-skip-permissions' in arguments, unattended)
            self.assertIn('--append-system-prompt-file', arguments)
            prompt = fleet.state / 'qa.txt'
            self.assertEqual(prompt.stat().st_mode & 0o777, 0o600)
            self.assertIn('Herdr session: groam', prompt.read_text())
            self.assertIn('# QA', prompt.read_text())
            fleet.unlock()

    def test_doctor_reports_login_without_model_request(self):
        fleet = self.fleet()
        fleet.validate_container = Mock()
        result = subprocess.CompletedProcess([], 0, json.dumps(
            dict(loggedIn=True, authMethod='claude.ai')), '')
        with patch.object(launcher.shutil, 'which', return_value='/tool'), \
             patch.object(launcher, 'call', return_value=result) as command:
            fleet.doctor()
        self.assertEqual(command.call_count, 2)
        self.assertEqual(command.call_args_list[0].args[0], ['claude', '--version'])
        self.assertEqual(command.call_args_list[1].args[0], ['claude', 'auth', 'status'])

    def test_doctor_missing_tools_and_login_fail_helpfully(self):
        fleet = self.fleet()
        fleet.validate_container = Mock()
        with patch.object(launcher.shutil, 'which', return_value=None), \
             self.assertRaisesRegex(launcher.LauncherError, 'rebuild'):
            fleet.doctor()
        with patch.object(launcher.shutil, 'which', return_value='/tool'), \
             patch.object(launcher, 'call', return_value=subprocess.CompletedProcess(
                 [], 0, '{"loggedIn":false}', '')), \
             self.assertRaisesRegex(launcher.LauncherError, 'auth login'):
            fleet.doctor()

    def test_plugin_cannot_target_a_different_workspace(self):
        fleet = self.fleet()
        fleet.plugin = True
        with patch.dict(os.environ, {'HERDR_WORKSPACE_ID': 'foreign'}), \
             self.assertRaisesRegex(launcher.LauncherError, 'did not originate'):
            fleet.guard_workspace('ours')

    def test_parser_keeps_session_and_permission_flags(self):
        with patch('sys.argv', ['agents.py', 'up', 'qa', '--session', 'qa-branch',
                                '--no-attach', '--unattended']):
            parsed = launcher.parse()
        self.assertEqual(parsed.roles, ['qa'])
        self.assertEqual(parsed.session, 'qa-branch')
        self.assertTrue(parsed.no_attach)
        self.assertTrue(parsed.unattended)


class CredentialMountTests(unittest.TestCase):
    def initialize(self, home):
        return subprocess.run(
            ['bash', str(launcher.REPO / '.devcontainer/initialize.sh')],
            env=dict(os.environ, HOME=str(home)), capture_output=True, check=False,
        )

    def test_creates_private_mount_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            self.assertEqual(self.initialize(home).returncode, 0)
            config = home / '.claude.json'
            self.assertEqual(config.read_text(), '{}\n')
            self.assertEqual(config.stat().st_mode & 0o777, 0o600)
            for path in [home / '.claude', home / '.config/gh']:
                self.assertEqual(path.stat().st_mode & 0o777, 0o700)

    def test_preserves_existing_credentials_and_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            config = home / '.claude.json'
            config.write_text('{"existing":"preserve"}\n')
            config.chmod(0o640)
            self.assertEqual(self.initialize(home).returncode, 0)
            self.assertEqual(config.read_text(), '{"existing":"preserve"}\n')
            self.assertEqual(config.stat().st_mode & 0o777, 0o640)

    def test_rejects_non_file_config_mount(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            config = home / '.claude.json'
            config.mkdir()
            self.assertNotEqual(self.initialize(home).returncode, 0)
            config.rmdir()
            config.symlink_to(home / 'missing')
            self.assertNotEqual(self.initialize(home).returncode, 0)
            self.assertTrue(config.is_symlink())


if __name__ == '__main__':
    unittest.main()
