import type React from 'react';
import DesktopRightColumn from '#tsx/components/shell/components/desktop-right-column';
import LeftColumn from '#tsx/components/shell/components/left-column';
import RightColumn from '#tsx/components/shell/components/right-column';
import TwoColumns from '#tsx/components/shell/components/two-columns';
import BannerLayout from './components/banner-layout';
import Card from './components/card';
import CardBody from './components/card-body';
import CardFooter from './components/card-footer';
import CardHeader from './components/card-header';
import Content from './components/content';
import Eyebrow from './components/eyebrow';
import Footer from './components/footer';
import Header from './components/header';
import Action from './components/page-action';
import PageBody from './components/page-body';
import PropertyGrid from './components/property-grid';
import Reveal from './components/reveal';
import Section from './components/section';
import ShellSectionHeader from './components/section-header';
import Stack from './components/stack';
import SurfaceWell from './components/surface-well';
import Tab from './components/tab';
import TabContainer from './components/tab-container';
import Title from './components/title';
import UnderlineNav from './components/underline-nav';
import type { ShellProps } from './types';

export type ShellComponent = React.FC<ShellProps> & {
  Action: typeof Action;
  Header: typeof Header;
  BannerLayout: typeof BannerLayout;
  Card: typeof Card;
  CardBody: typeof CardBody;
  CardFooter: typeof CardFooter;
  CardHeader: typeof CardHeader;
  Title: typeof Title;
  Eyebrow: typeof Eyebrow;
  Tab: typeof Tab;
  TabContainer: typeof TabContainer;
  Content: typeof Content;
  Footer: typeof Footer;
  PageBody: typeof PageBody;
  PropertyGrid: typeof PropertyGrid;
  Reveal: typeof Reveal;
  Section: typeof Section;
  SectionHeader: typeof ShellSectionHeader;
  TwoColumns: typeof TwoColumns;
  LeftColumn: typeof LeftColumn;
  RightColumn: typeof RightColumn;
  DesktopRightColumn: typeof DesktopRightColumn;
  Stack: typeof Stack;
  SurfaceWell: typeof SurfaceWell;
  UnderlineNav: typeof UnderlineNav;
};

export const shellSubcomponents = {
  Action,
  Header,
  BannerLayout,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Title,
  Eyebrow,
  Tab,
  TabContainer,
  Content,
  Footer,
  PageBody,
  PropertyGrid,
  Reveal,
  Section,
  SectionHeader: ShellSectionHeader,
  TwoColumns,
  LeftColumn,
  RightColumn,
  DesktopRightColumn,
  Stack,
  SurfaceWell,
  UnderlineNav
} as const;
