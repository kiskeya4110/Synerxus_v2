import { SVGProps } from "react";

export const SDGIcons: Record<number, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  1: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#E5243B" />
      <path d="M40 75V37.5H35V32.5H45V75H40Z" fill="white" />
      <path d="M65 75V70H50V37.5H45V32.5H55V65H65V32.5H70V70H65V75H65Z" fill="white" />
    </svg>
  ),
  2: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#DDA63A" />
      <path d="M30 53.75C30 42.7 39.25 33.75 50 33.75C60.75 33.75 70 42.7 70 53.75C70 64.8 60.75 73.75 50 73.75C39.25 73.75 30 64.8 30 53.75Z" fill="white" />
      <path d="M55 26.25H45V36.25H55V26.25Z" fill="white" />
      <path d="M75 48.75H65V58.75H75V48.75Z" fill="white" />
      <path d="M35 48.75H25V58.75H35V48.75Z" fill="white" />
      <path d="M55 71.25H45V81.25H55V71.25Z" fill="white" />
    </svg>
  ),
  3: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#4C9F38" />
      <path d="M68.75 37.5C68.75 42.38 64.63 46.25 59.38 46.25C54.13 46.25 50 42.38 50 37.5C50 32.62 54.13 28.75 59.38 28.75C64.63 28.75 68.75 32.62 68.75 37.5Z" fill="white" />
      <path d="M50 46.25C50 51.13 45.88 55 40.63 55C35.38 55 31.25 51.13 31.25 46.25C31.25 41.37 35.38 37.5 40.63 37.5C45.88 37.5 50 41.37 50 46.25Z" fill="white" />
      <path d="M68.75 62.5C68.75 67.38 64.63 71.25 59.38 71.25C54.13 71.25 50 67.38 50 62.5C50 57.62 54.13 53.75 59.38 53.75C64.63 53.75 68.75 57.62 68.75 62.5Z" fill="white" />
      <path d="M50 62.5C50 67.38 45.88 71.25 40.63 71.25C35.38 71.25 31.25 67.38 31.25 62.5C31.25 57.62 35.38 53.75 40.63 53.75C45.88 53.75 50 57.62 50 62.5Z" fill="white" />
    </svg>
  ),
  4: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#C5192D" />
      <path d="M25 30V35H35V70H40V35H50V30H25Z" fill="white" />
      <path d="M60 30V52.5H52.5V57.5H60V70H65V57.5H72.5V52.5H65V30H60Z" fill="white" />
    </svg>
  ),
  5: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#FF3A21" />
      <path d="M30 30H70V38.75H30V30Z" fill="white" />
      <path d="M35 41.25H65V50H35V41.25Z" fill="white" />
      <path d="M38.75 52.5H61.25V61.25H38.75V52.5Z" fill="white" />
      <path d="M45 63.75H55V72.5H45V63.75Z" fill="white" />
    </svg>
  ),
  6: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#26BDE2" />
      <path d="M50 26.25C38.75 26.25 30 34.75 30 45C30 50.88 33.13 56.25 38.13 59.25C34.38 61.75 32.5 65 32.5 68.75C32.5 74.62 39.38 81.25 50 81.25C60.63 81.25 67.5 74.62 67.5 68.75C67.5 65 65.63 61.75 61.88 59.25C66.88 56.25 70 50.88 70 45C70 34.75 61.25 26.25 50 26.25ZM50 38.75C53.75 38.75 56.88 41.62 56.88 45C56.88 48.38 53.75 51.25 50 51.25C46.25 51.25 43.13 48.38 43.13 45C43.13 41.62 46.25 38.75 50 38.75ZM50 71.25C45 71.25 42.5 69.38 42.5 67.5C42.5 65.62 45 63.75 50 63.75C55 63.75 57.5 65.62 57.5 67.5C57.5 69.38 55 71.25 50 71.25Z" fill="white" />
    </svg>
  ),
  7: (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="6" fill="#FCC30B" />
      <path d="M30 43.75V31.25H70V43.75H56.25V51.25H70V63.75H56.25V71.25H70V81.25H30V71.25H43.75V63.75H30V51.25H43.75V43.75H30Z" fill="white" />
    </svg>
  ),
  // Add more SDG icons here...
};

export default SDGIcons;
