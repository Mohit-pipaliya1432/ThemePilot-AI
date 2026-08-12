import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const searchParams = url.searchParams.toString();

  if (searchParams) {
    throw redirect(`/app?${searchParams}`);
  }

  throw redirect("/app");
};

export default function Index() {
  return null;
}