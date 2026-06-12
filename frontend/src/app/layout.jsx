import "./globals.css";
import { SessionProvider } from "./providers";

export const metadata = {
  title: "Court Piece",
  description: "Play Court Piece (Rung) online with friends",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
