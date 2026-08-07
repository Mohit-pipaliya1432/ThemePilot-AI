import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const scanId = Number(params.id);

  if (!Number.isInteger(scanId)) {
    throw new Response("Invalid scan report ID.", {
      status: 400,
    });
  }

  const report = await prisma.scanHistory.findFirst({
    where: {
      id: scanId,
      shop: session.shop,
    },
  });

  if (!report) {
    throw new Response("Scan report not found.", {
      status: 404,
    });
  }

  await prisma.scanHistory.delete({
    where: {
      id: scanId,
    },
  });

  return redirect("/app");
};