import type { Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { BotIdClient } from "botid/client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/components/providers/i18n-provider";
import {
	getMessages,
	initServerI18n,
} from "@i18next-toolkit/nextjs-approuter/server";
import { i18nConfig } from "../../i18n.config";
import { baseMetaData } from "../metadata";
import "../globals.css";

const siteFont = Inter({ subsets: ["latin"] });

export const metadata = baseMetaData;

export const viewport: Viewport = {
	viewportFit: "cover",
};

initServerI18n(i18nConfig);

const protectedRoutes = [
	{
		path: "/none",
		method: "GET",
	},
];

export function generateStaticParams() {
	return i18nConfig.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	// Reading the URL locale instead of cookies keeps pages eligible for prerendering.
	const { locale } = await params;
	const messages = await getMessages(locale);

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<BotIdClient protect={protectedRoutes} />
				<Script
					src="https://app.tianji.dev/tracker.js"
					data-website-id="cmm637ekbb51pbiglgy2s7n6k"
				/>
			</head>
			<body className={`${siteFont.className} font-sans antialiased`}>
				<I18nProvider
					locale={locale}
					locales={i18nConfig.locales}
					defaultLocale={i18nConfig.defaultLocale}
					messages={messages}
					routingStrategy={i18nConfig.routingStrategy}
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						disableTransitionOnChange={true}
					>
						<TooltipProvider>
							<Toaster />
							{children}
						</TooltipProvider>
					</ThemeProvider>
				</I18nProvider>
			</body>
		</html>
	);
}
