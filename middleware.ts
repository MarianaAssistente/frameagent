import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/locale(.*)",
]);

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = req.nextUrl;

  // Usuário autenticado tentando acessar / ou /sign-in → redireciona para /dashboard
  if (userId && (url.pathname === "/" || url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rota protegida sem autenticação → Clerk cuida do redirect para /sign-in
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
