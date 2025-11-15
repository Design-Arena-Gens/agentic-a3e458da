export const metadata = {
  title: "All Life Dashboard",
  description: "Minimalistic personal dashboard"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
