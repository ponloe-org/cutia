// Project IDs are browser-local, so cache each URL's shell on its first request.
export function generateStaticParams() {
	return [];
}

export default function EditorLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
