import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  await prisma.scanHistory.deleteMany({
    where: {
      shop: session.shop,
    },
  });

  return redirect("/app");
};