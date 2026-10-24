import { ListActions } from './list-actions';
import { ListAge } from './list-age';
import { ListAside } from './list-aside';
import { ListAvatar } from './list-avatar';
import { ListBody } from './list-body';
import { ListCheckbox } from './list-checkbox';
import { ListControls } from './list-controls';
import { ListDescription } from './list-description';
import { ListEmpty } from './list-empty';
import { ListExpanded } from './list-expanded';
import { ListFooter } from './list-footer';
import { ListGroup } from './list-group';
import { ListHints } from './list-hints';
import { ListIcon } from './list-icon';
import { ListInline } from './list-inline';
import { ListLeading } from './list-leading';
import { ListMain } from './list-main';
import { ListMeta } from './list-meta';
import { ListRoot } from './list-root';
import { ListRow } from './list-row';
import { ListSearch } from './list-search';
import { ListSearchTrigger } from './list-search-trigger';
import { ListSort } from './list-sort';
import { ListTitle } from './list-title';
import { ListToolbar } from './list-toolbar';

export type { ListHint } from './list-hints';
export {
  listSearchPersonSlugs,
  listSearchSlug,
  parseListSearch,
  segmentListSearch,
  tokenizeListSearch,
  type ListSearchSegment,
  type ListSearchSuggestion,
  type ListSearchToken,
  type ListSearchFacet,
  type ParsedListSearch
} from './list-search-query';

/** The one list primitive. See README.md in this folder for the composition. */
export const List = Object.assign(ListRoot, {
  Actions: ListActions,
  Age: ListAge,
  Aside: ListAside,
  Avatar: ListAvatar,
  Body: ListBody,
  Checkbox: ListCheckbox,
  Controls: ListControls,
  Description: ListDescription,
  Empty: ListEmpty,
  Expanded: ListExpanded,
  Footer: ListFooter,
  Group: ListGroup,
  Hints: ListHints,
  Icon: ListIcon,
  Inline: ListInline,
  Leading: ListLeading,
  Main: ListMain,
  Meta: ListMeta,
  Row: ListRow,
  Search: ListSearch,
  SearchTrigger: ListSearchTrigger,
  Sort: ListSort,
  Title: ListTitle,
  Toolbar: ListToolbar
});
