/** @type {import('next').NextConfig} */
const nextConfig = {
  crossOrigin: "anonymous",
  transpilePackages: [
    "@mui/x-scheduler",
    "@mui/x-scheduler-internals",
    "@atlaskit/pragmatic-drag-and-drop",
    "@atlaskit/pragmatic-drag-and-drop-auto-scroll",
  ],
};

export default nextConfig;
