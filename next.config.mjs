/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js imports from crashing the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        async_hooks: false,
        perf_hooks: false,
        util: false,
        url: false,
        querystring: false,
        net: false,
        tls: false,
        child_process: false,
        events: false,
        buffer: false,
        process: false,
      };
    }
    return config;
  },
  // Process LangChain packages on the server side only
  transpilePackages: [
    "@langchain/core",
    "@langchain/langgraph",
    "langchain",
    "@langchain/openai",
    "zod-to-json-schema"
  ],
  // Specify modules that should be treated as external
  experimental: {
    serverComponentsExternalPackages: [
      "@langchain/core",
      "@langchain/langgraph",
      "langchain",
      "@langchain/openai"
    ]
  }
};

export default nextConfig; 