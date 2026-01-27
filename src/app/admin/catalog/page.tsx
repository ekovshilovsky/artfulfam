"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Button } from "@/components/ui/button";
 import { Separator } from "@/components/ui/separator";
 import { api } from "@/trpc/react";
 
 type CatalogCategory = {
   id?: number;
   name?: string;
   title?: string;
 };
 
 type CatalogProduct = {
   id?: number;
   name?: string;
   title?: string;
   model?: string;
   image?: string;
   thumbnail_url?: string;
 };
 
 const buildHref = (href: string, token: string | null) =>
   token ? `${href}?admin_token=${encodeURIComponent(token)}` : href;
 
 export default function CatalogPage() {
   const searchParams = useSearchParams();
   const router = useRouter();
   const token = searchParams.get("admin_token");
 
   const [search, setSearch] = useState("");
   const [offset, setOffset] = useState(0);
   const [limit, setLimit] = useState(20);
   const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
 
   const categoriesQuery = api.adminProducts.listCatalogCategories.useQuery();
   const productsQuery = api.adminProducts.listCatalogProducts.useQuery({
     offset,
     limit,
     search: search.trim() ? search.trim() : undefined,
     categoryIds: selectedCategoryIds.length ? selectedCategoryIds : undefined,
   });
 
   const categories = useMemo(() => {
     const data = categoriesQuery.data as unknown as CatalogCategory[] | { categories?: CatalogCategory[] };
     if (Array.isArray(data)) return data;
     return data?.categories ?? [];
   }, [categoriesQuery.data]);
 
   const products = useMemo(() => {
     const data = productsQuery.data as unknown as
       | CatalogProduct[]
       | { items?: CatalogProduct[] };
     if (Array.isArray(data)) return data;
     return data?.items ?? [];
   }, [productsQuery.data]);
 
   const createDraft = api.adminProducts.createDraftFromCatalog.useMutation({
     onSuccess: (result) => {
       router.push(buildHref(`/admin/products/${result.productId}`, token));
     },
   });
 
   const toggleCategory = (id: number) => {
     setOffset(0);
     setSelectedCategoryIds((current) =>
       current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
     );
   };
 
   return (
     <div className="grid gap-6">
       <Card>
         <CardHeader>
           <CardTitle>Catalog</CardTitle>
           <CardDescription>Search and filter Printful catalog products.</CardDescription>
         </CardHeader>
         <CardContent className="grid gap-4">
           <div className="grid gap-2">
             <Label htmlFor="search">Search</Label>
             <Input
               id="search"
               value={search}
               onChange={(event) => {
                 setSearch(event.target.value);
                 setOffset(0);
               }}
               placeholder="Search catalog"
             />
           </div>
           <div className="grid gap-2">
             <Label>Categories</Label>
             <div className="flex flex-wrap gap-2">
               {categories.map((category) => {
                 if (!category.id) return null;
                 const label = category.title ?? category.name ?? `Category ${category.id}`;
                 const active = selectedCategoryIds.includes(category.id);
                 return (
                   <Button
                     key={category.id}
                     variant={active ? "secondary" : "outline"}
                     size="sm"
                     onClick={() => toggleCategory(category.id!)}
                     type="button"
                   >
                     {label}
                   </Button>
                 );
               })}
             </div>
           </div>
           <div className="grid gap-2">
             <Label htmlFor="limit">Page size</Label>
             <Input
               id="limit"
               type="number"
               min={1}
               max={100}
               value={limit}
               onChange={(event) => {
                 const next = Number(event.target.value);
                 if (!Number.isNaN(next)) setLimit(next);
               }}
             />
           </div>
           <div className="flex items-center gap-3">
             <Button
               variant="outline"
               onClick={() => setOffset((value) => Math.max(0, value - limit))}
               disabled={offset === 0}
             >
               Prev
             </Button>
             <Button variant="outline" onClick={() => setOffset((value) => value + limit)}>
               Next
             </Button>
           </div>
         </CardContent>
       </Card>
 
       <Separator />
 
       <div className="grid gap-4 md:grid-cols-2">
         {products.map((product) => {
           const label = product.model ?? product.name ?? product.title ?? "Catalog product";
           const image = product.thumbnail_url ?? product.image ?? null;
           return (
             <Card key={product.id ?? label} size="sm">
               {image ? (
                 <img
                   src={image}
                   alt={label}
                   className="h-40 w-full object-cover"
                   loading="lazy"
                 />
               ) : null}
               <CardHeader>
                 <CardTitle>{label}</CardTitle>
                 <CardDescription>ID: {product.id ?? "Unknown"}</CardDescription>
                 <CardAction>
                   <Button
                     size="sm"
                     onClick={() =>
                       createDraft.mutate({
                         catalogProductId: product.id ?? 0,
                       })
                     }
                     disabled={!product.id || createDraft.isPending}
                   >
                     Create draft
                   </Button>
                 </CardAction>
               </CardHeader>
             </Card>
           );
         })}
       </div>
     </div>
   );
 }
