import {
  Outlet,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";

import {
  useEffect,
  useState,
} from "react";

import {
  boundary,
} from "@shopify/shopify-app-react-router/server";

import {
  AppProvider,
} from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

import AppLoader from "../components/common/AppLoader.jsx";

import "../styles/dashboard.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return {
    apiKey:
      process.env.SHOPIFY_API_KEY || "",
  };
};

export default function App() {
  const { apiKey } =
    useLoaderData();

  const navigation =
    useNavigation();

  const [
    isInitialLoading,
    setIsInitialLoading,
  ] = useState(true);

  const isNavigating =
    navigation.state !== "idle";

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setIsInitialLoading(
            false,
          );
        },
        3000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, []);

  const showLoader =
    isInitialLoading ||
    isNavigating;

  return (
    <AppProvider
      embedded
      apiKey={apiKey}
    >
      <s-app-nav>
        <s-link href="/app">
          Home
        </s-link>

        <s-link href="/app/ai-products">
          All Products
        </s-link>

        <s-link href="/app/bulk-optimization">
          Bulk Optimization
        </s-link>

        <s-link href="/app/scan-history">
          Scan History
        </s-link>

        <s-link href="/app/analytics">
          Analytics
        </s-link>

        <s-link href="/app/ai-history">
          AI History
        </s-link>

        <s-link href="/app/settings">
          Settings
        </s-link>
        
      </s-app-nav>

      <div className="tp-app-shell">
        <Outlet />

        {showLoader && (
          <AppLoader
            fullScreen
            message={
              isInitialLoading
                ? "Preparing your ThemePilot workspace..."
                : "Loading your ThemePilot workspace..."
            }
          />
        )}
      </div>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(
    useRouteError(),
  );
}

export const headers = (
  headersArgs,
) => {
  return boundary.headers(
    headersArgs,
  );
};