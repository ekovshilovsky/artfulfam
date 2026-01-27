"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
 
 const NAV_ITEMS = [
   { href: "/admin", label: "Overview" },
   { href: "/admin/catalog", label: "Catalog" },
 ];
 
 const buildHref = (href: string, token: string | null) =>
   token ? `${href}?admin_token=${encodeURIComponent(token)}` : href;
 
 export function AdminShell({ children }: { children: React.ReactNode }) {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const router = useRouter();
   const tokenFromQuery = searchParams.get("admin_token");
   const [tokenInput, setTokenInput] = useState("");
 
   useEffect(() => {
     if (tokenFromQuery) {
       window.localStorage.setItem("admin_token", tokenFromQuery);
       setTokenInput(tokenFromQuery);
       return;
     }
 
     const stored = window.localStorage.getItem("admin_token");
     if (stored) {
       setTokenInput(stored);
     }
   }, [tokenFromQuery]);
 
   const effectiveToken = useMemo(() => tokenFromQuery ?? tokenInput ?? "", [
     tokenFromQuery,
     tokenInput,
   ]);
 
   const handleTokenSave = () => {
     const nextToken = tokenInput.trim();
     const nextParams = new URLSearchParams(searchParams.toString());
     if (nextToken) {
       nextParams.set("admin_token", nextToken);
       window.localStorage.setItem("admin_token", nextToken);
     } else {
       nextParams.delete("admin_token");
       window.localStorage.removeItem("admin_token");
     }
 
     router.replace(`${pathname}?${nextParams.toString()}`);
   };
 
   return (
     <div className="min-h-screen bg-background">
       <header className="border-b border-border/40">
         <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6">
           <div className="flex flex-wrap items-center justify-between gap-4">
             <div>
               <div className="text-lg font-semibold">Admin</div>
               <div className="text-muted-foreground text-sm">
                 Printful catalog, drafts, and sync
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="grid gap-2">
                 <Label htmlFor="admin-token">Admin token</Label>
                 <Input
                   id="admin-token"
                   value={tokenInput}
                   onChange={(event) => setTokenInput(event.target.value)}
                   placeholder="Set admin token"
                 />
               </div>
               <Button onClick={handleTokenSave} variant="outline">
                 Save
               </Button>
             </div>
           </div>
           <Separator />
           <nav className="flex flex-wrap gap-2">
             {NAV_ITEMS.map((item) => {
               const active = pathname === item.href;
               return (
                 <Button key={item.href} variant={active ? "secondary" : "ghost"} size="sm" asChild>
                   <Link href={buildHref(item.href, effectiveToken)}>{item.label}</Link>
                 </Button>
               );
             })}
           </nav>
         </div>
       </header>
       <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
     </div>
   );
 }
