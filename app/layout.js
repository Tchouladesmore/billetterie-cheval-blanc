import "./globals.css";

export const metadata = { title: "Billetterie Cheval Blanc" };
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
