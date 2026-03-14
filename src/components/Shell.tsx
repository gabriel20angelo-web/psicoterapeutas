"use client";
import Sidebar from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        id="main-content"
        className="md:ml-[240px] min-h-screen transition-all duration-300"
      >
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
