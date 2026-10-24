import { loadDefinitions, toRule } from './definitions';
import { gitRepository } from './repository';

// `vp run lint:conventions`: runs every rule in rules/*.json and reports all violations at once.
const rules = loadDefinitions().map(toRule);
const repository = gitRepository();
let violations = 0;
for (const rule of rules) {
  const locations = rule.check(repository);
  violations += locations.length;
  if (locations.length)
    console.error(
      `${rule.message} [${rule.name}]:\n${locations.map((l) => `  - ${l}`).join('\n')}\n`
    );
}
if (violations) process.exit(1);
console.log(`${repository.files.length} files follow all ${rules.length} repository conventions.`);
