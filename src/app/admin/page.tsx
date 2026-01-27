"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 
 const buildHref = (href: string, token: string | null) =>
   token ? `${href}?admin_token=${encodeURIComponent(token)}` : href;
 
 export default function AdminPage() {
   const searchParams = useSearchParams();
   const token = searchParams.get("admin_token");
 
   return (
     <div className="grid gap-6">
       <Card>
         <CardHeader>
           <CardTitle>Start here</CardTitle>
           <CardDescription>Browse the Printful catalog and create drafts.</CardDescription>
         </CardHeader>
         <CardContent>
           <Link className="text-primary underline" href={buildHref("/admin/catalog", token)}>
             Open catalog
           </Link>
         </CardContent>
       </Card>
     </div>
   );
 }
