"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";

export function MobileHardwareListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only listen in a browser environment
    if (typeof window === "undefined") return;

    let listenerSetup = false;

    const setupListener = async () => {
      try {
        await App.addListener("backButton", async (event) => {
          if (pathname === "/technician" || pathname === "/") {
            // If at the root of the technician app, ask to exit
            const { value } = await Dialog.confirm({
              title: "Exit App",
              message: "Are you sure you want to exit TechnoSys?",
              okButtonTitle: "Exit",
              cancelButtonTitle: "Cancel",
            });

            if (value) {
              App.exitApp();
            }
          } else {
            // Otherwise, pop the browser history stack
            if (event.canGoBack) {
              router.back();
            } else {
              // Failsafe
              App.exitApp();
            }
          }
        });
        listenerSetup = true;
      } catch (err) {
        console.log("Not in a native capacitor environment:", err);
      }
    };

    setupListener();

    return () => {
      if (listenerSetup) {
        App.removeAllListeners();
      }
    };
  }, [pathname, router]);

  return null; // This component does not render anything
}
