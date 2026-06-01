import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "node_logic",
    description: "node_logic",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
