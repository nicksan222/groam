import type React from 'react';
import DesktopRightColumn from '#tsx/components/shell/components/desktop-right-column';
import LeftColumn from '#tsx/components/shell/components/left-column';
import RightColumn from '#tsx/components/shell/components/right-column';
import TwoColumns from '#tsx/components/shell/components/two-columns';
import Action from './components/action';
import Back from './components/back';
import Banner from './components/banner';
import BannerCrumb from './components/banner-crumb';
import BannerHeading from './components/banner-heading';
import BannerHero from './components/banner-hero';
import BannerInset from './components/banner-inset';
import BannerLayout from './components/banner-layout';
import ShellBreadcrumb from './components/breadcrumb';
import Card from './components/card';
import CardBody from './components/card-body';
import CardFooter from './components/card-footer';
import CardHeader from './components/card-header';
import Content from './components/content';
import Description from './components/description';
import Eyebrow from './components/eyebrow';
import Footer from './components/footer';
import Header from './components/header';
import NoticeBanner from './components/notice-banner';
import PageBody from './components/page-body';
import PageStack from './components/page-stack';
import PropertyGrid from './components/property-grid';
import Reveal from './components/reveal';
import Section from './components/section';
import ShellSectionHeader from './components/section-header';
import Split from './components/split';
import Stack from './components/stack';
import Steps from './components/steps';
import SurfaceWell from './components/surface-well';
import Tab from './components/tab';
import TabContainer from './components/tab-container';
import Title from './components/title';
import UnderlineNav from './components/underline-nav';
import type { ShellProps } from './types';

export type ShellComponent = React.FC<ShellProps> & {
  Header: typeof Header;
  Back: typeof Back;
  Banner: typeof Banner;
  BannerCrumb: typeof BannerCrumb;
  BannerHeading: typeof BannerHeading;
  BannerHero: typeof BannerHero;
  BannerInset: typeof BannerInset;
  BannerLayout: typeof BannerLayout;
  Card: typeof Card;
  CardBody: typeof CardBody;
  CardFooter: typeof CardFooter;
  CardHeader: typeof CardHeader;
  Breadcrumb: typeof ShellBreadcrumb;
  Title: typeof Title;
  Description: typeof Description;
  Action: typeof Action;
  Eyebrow: typeof Eyebrow;
  Tab: typeof Tab;
  TabContainer: typeof TabContainer;
  Content: typeof Content;
  Footer: typeof Footer;
  NoticeBanner: typeof NoticeBanner;
  PageBody: typeof PageBody;
  PageStack: typeof PageStack;
  PropertyGrid: typeof PropertyGrid;
  Reveal: typeof Reveal;
  Section: typeof Section;
  SectionHeader: typeof ShellSectionHeader;
  TwoColumns: typeof TwoColumns;
  LeftColumn: typeof LeftColumn;
  RightColumn: typeof RightColumn;
  DesktopRightColumn: typeof DesktopRightColumn;
  /** @deprecated Use TwoColumns, LeftColumn, and RightColumn. */
  Split: typeof Split;
  Stack: typeof Stack;
  Steps: typeof Steps;
  SurfaceWell: typeof SurfaceWell;
  UnderlineNav: typeof UnderlineNav;
};

export const shellSubcomponents = {
  Header,
  Back,
  Banner,
  BannerCrumb,
  BannerHeading,
  BannerHero,
  BannerInset,
  BannerLayout,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Breadcrumb: ShellBreadcrumb,
  Title,
  Description,
  Action,
  Eyebrow,
  Tab,
  TabContainer,
  Content,
  Footer,
  NoticeBanner,
  PageBody,
  PageStack,
  PropertyGrid,
  Reveal,
  Section,
  SectionHeader: ShellSectionHeader,
  TwoColumns,
  LeftColumn,
  RightColumn,
  DesktopRightColumn,
  Split,
  Stack,
  Steps,
  SurfaceWell,
  UnderlineNav
} as const;
