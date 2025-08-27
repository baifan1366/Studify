import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 所有受保护的路由前缀
const PROTECTED_ROUTES = ["/home", "/order-preview", "/dashboard"]; // add more if needed

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 初始化 supabase 响应对象
  let supabaseResponse = NextResponse.next({ request });

  // 创建 Supabase 客户端
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 检查登录状态
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 检查是否访问受保护路由
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // 默认放行
  return supabaseResponse;
}

// 忽略 API、Next.js 内部和静态文件
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
