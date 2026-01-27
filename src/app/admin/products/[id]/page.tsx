"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Separator } from "@/components/ui/separator";
 import { Textarea } from "@/components/ui/textarea";
 import { api } from "@/trpc/react";
 
 type PlacementOption = {
   type?: string;
   placement?: string;
   id?: string;
 };
 
 export default function DraftProductPage() {
   const params = useParams();
   const searchParams = useSearchParams();
   const token = searchParams.get("admin_token");
   const productId = Number(params.id);
 
   const utils = api.useUtils();
   const syncQuery = api.adminProducts.getSyncStatus.useQuery({ productId });
 
   const [productForm, setProductForm] = useState({
     slug: "",
     title: "",
     description: "",
     thumbnailUrl: "",
     status: "draft",
   });
   const [imageList, setImageList] = useState("");
   const [variantPrices, setVariantPrices] = useState<Record<number, string>>({});
 
   const [uploadVariantId, setUploadVariantId] = useState<string>("");
   const [uploadPlacement, setUploadPlacement] = useState<string>("");
   const [uploadFile, setUploadFile] = useState<File | null>(null);
   const [uploadStatus, setUploadStatus] = useState<string>("");
 
   useEffect(() => {
     if (!syncQuery.data) return;
     const { product, images, variants } = syncQuery.data;
     setProductForm({
       slug: product.slug ?? "",
       title: product.title ?? "",
       description: product.description ?? "",
       thumbnailUrl: product.thumbnailUrl ?? "",
       status: product.status ?? "draft",
     });
     setImageList(images.map((image) => image.url).join("\n"));
     setVariantPrices(
       variants.reduce((acc, variant) => {
         acc[variant.id] = String(variant.retailPrice ?? "");
         return acc;
       }, {} as Record<number, string>),
     );
   }, [syncQuery.data]);
 
   const variants = syncQuery.data?.variants ?? [];
 
   const placementQuery = api.adminProducts.getVariantPrintfiles.useQuery(
     { variantId: Number(uploadVariantId) },
     { enabled: !!uploadVariantId },
   );
 
   const placementOptions = useMemo(() => {
     const data = placementQuery.data as unknown as PlacementOption[] | { printfiles?: PlacementOption[] };
     const list = Array.isArray(data) ? data : data?.printfiles ?? [];
     const options = new Set<string>();
     list.forEach((item) => {
       const value = item.type ?? item.placement ?? item.id;
       if (value) options.add(value);
     });
     return Array.from(options);
   }, [placementQuery.data]);
 
   const saveDraft = api.adminProducts.saveDraftProduct.useMutation({
     onSuccess: async () => {
       await utils.adminProducts.getSyncStatus.invalidate({ productId });
     },
   });
 
   const syncToPrintful = api.adminProducts.syncToPrintful.useMutation({
     onSuccess: async () => {
       await utils.adminProducts.getSyncStatus.invalidate({ productId });
     },
   });
 
   const uploadMutation = api.adminProducts.createPrintfileUpload.useMutation();
   const markUploadedMutation = api.adminProducts.markPrintfileUploaded.useMutation();
 
   const handleSave = () => {
     if (!syncQuery.data) return;
     const images = imageList
       .split("\n")
       .map((line) => line.trim())
       .filter(Boolean);
 
     saveDraft.mutate({
       product: {
         id: productId,
         slug: productForm.slug,
         title: productForm.title,
         description: productForm.description || undefined,
         thumbnailUrl: productForm.thumbnailUrl || undefined,
         status: productForm.status as "draft" | "published" | "archived",
       },
       variants: syncQuery.data.variants.map((variant) => ({
         id: variant.id,
         size: variant.size,
         color: variant.color,
         sku: variant.sku ?? undefined,
         retailPrice: variantPrices[variant.id] ?? String(variant.retailPrice ?? ""),
         currency: variant.currency ?? "USD",
         availabilityStatus: variant.availabilityStatus as
           | "active"
           | "discontinued"
           | "out_of_stock"
           | "temporary_out_of_stock",
         printfulVariantId: variant.printfulVariantId,
       })),
       images,
     });
   };
 
   const handleUpload = async () => {
     if (!uploadVariantId || !uploadPlacement || !uploadFile) {
       setUploadStatus("Select a variant, placement, and file.");
       return;
     }
 
     setUploadStatus("Requesting upload URL...");
     try {
       const result = await uploadMutation.mutateAsync({
         variantId: Number(uploadVariantId),
         placementType: uploadPlacement,
         fileName: uploadFile.name,
         contentType: uploadFile.type || "application/octet-stream",
       });
 
       setUploadStatus("Uploading to storage...");
       const uploadResponse = await fetch(result.uploadUrl, {
         method: "PUT",
         headers: {
           "Content-Type": uploadFile.type || "application/octet-stream",
         },
         body: uploadFile,
       });
 
       if (!uploadResponse.ok) {
         throw new Error(`Upload failed with status ${uploadResponse.status}`);
       }
 
       setUploadStatus("Marking uploaded...");
       await markUploadedMutation.mutateAsync({ fileId: result.fileId });
       await utils.adminProducts.getSyncStatus.invalidate({ productId });
       setUploadStatus("Upload complete.");
       setUploadFile(null);
     } catch (error) {
       const message = error instanceof Error ? error.message : "Upload failed";
       setUploadStatus(message);
     }
   };
 
   if (!syncQuery.data) {
     return <div>Loading...</div>;
   }
 
   return (
     <div className="grid gap-6">
       <Card>
         <CardHeader>
           <CardTitle>Draft product</CardTitle>
           <CardDescription>Product ID: {productId}</CardDescription>
         </CardHeader>
         <CardContent className="grid gap-4">
           <div className="grid gap-2">
             <Label htmlFor="title">Title</Label>
             <Input
               id="title"
               value={productForm.title}
               onChange={(event) => setProductForm({ ...productForm, title: event.target.value })}
             />
           </div>
           <div className="grid gap-2">
             <Label htmlFor="slug">Slug</Label>
             <Input
               id="slug"
               value={productForm.slug}
               onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })}
             />
           </div>
           <div className="grid gap-2">
             <Label htmlFor="thumbnail">Thumbnail URL</Label>
             <Input
               id="thumbnail"
               value={productForm.thumbnailUrl}
               onChange={(event) =>
                 setProductForm({ ...productForm, thumbnailUrl: event.target.value })
               }
             />
           </div>
           <div className="grid gap-2">
             <Label htmlFor="description">Description</Label>
             <Textarea
               id="description"
               value={productForm.description}
               onChange={(event) =>
                 setProductForm({ ...productForm, description: event.target.value })
               }
             />
           </div>
           <div className="grid gap-2">
             <Label htmlFor="images">Image URLs (one per line)</Label>
             <Textarea
               id="images"
               value={imageList}
               onChange={(event) => setImageList(event.target.value)}
             />
           </div>
           <div className="flex flex-wrap items-center gap-3">
             <Button onClick={handleSave} disabled={saveDraft.isPending}>
               Save draft
             </Button>
             {saveDraft.isPending ? <div>Saving...</div> : null}
           </div>
         </CardContent>
       </Card>
 
       <Card>
         <CardHeader>
           <CardTitle>Variants</CardTitle>
           <CardDescription>Adjust pricing before syncing.</CardDescription>
         </CardHeader>
         <CardContent className="grid gap-3">
           {variants.map((variant) => (
             <div key={variant.id} className="grid gap-2 rounded-xl border border-border/40 p-4">
               <div className="text-sm font-medium">
                 {variant.size} / {variant.color}
               </div>
               <div className="grid gap-2 md:grid-cols-2">
                 <div className="grid gap-1">
                   <Label>Retail price</Label>
                   <Input
                     value={variantPrices[variant.id] ?? ""}
                     onChange={(event) =>
                       setVariantPrices({
                         ...variantPrices,
                         [variant.id]: event.target.value,
                       })
                     }
                   />
                 </div>
                 <div className="grid gap-1">
                   <Label>Currency</Label>
                   <Input value={variant.currency ?? "USD"} disabled />
                 </div>
               </div>
               <div className="text-xs text-muted-foreground">
                 Printful variant ID: {variant.printfulVariantId}
               </div>
             </div>
           ))}
         </CardContent>
       </Card>
 
       <Card>
         <CardHeader>
           <CardTitle>Print files</CardTitle>
           <CardDescription>Upload art files per variant and placement.</CardDescription>
         </CardHeader>
         <CardContent className="grid gap-4">
           <div className="grid gap-3 md:grid-cols-3">
             <div className="grid gap-1">
               <Label>Variant</Label>
               <Select value={uploadVariantId} onValueChange={setUploadVariantId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select variant" />
                 </SelectTrigger>
                 <SelectContent>
                   {variants.map((variant) => (
                     <SelectItem key={variant.id} value={String(variant.id)}>
                       {variant.size} / {variant.color}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="grid gap-1">
               <Label>Placement</Label>
               <Select value={uploadPlacement} onValueChange={setUploadPlacement}>
                 <SelectTrigger>
                   <SelectValue placeholder="Placement type" />
                 </SelectTrigger>
                 <SelectContent>
                   {(placementOptions.length ? placementOptions : ["front"]).map((option) => (
                     <SelectItem key={option} value={option}>
                       {option}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="grid gap-1">
               <Label>File</Label>
               <Input
                 type="file"
                 onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
               />
             </div>
           </div>
           <div className="flex items-center gap-3">
             <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
               Upload file
             </Button>
             <div className="text-sm text-muted-foreground">{uploadStatus}</div>
           </div>
           <Separator />
           <div className="grid gap-2">
             {variants.map((variant) => (
               <div key={variant.id} className="grid gap-1 text-sm">
                 <div className="font-medium">
                   {variant.size} / {variant.color}
                 </div>
                 <div className="grid gap-1">
                   {(variant.files ?? []).map((file) => (
                     <div key={file.id} className="text-xs text-muted-foreground">
                       {file.placementType} · {file.status} · {file.fileUrl}
                     </div>
                   ))}
                   {!variant.files?.length ? (
                     <div className="text-xs text-muted-foreground">No files uploaded.</div>
                   ) : null}
                 </div>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
 
       <Card>
         <CardHeader>
           <CardTitle>Sync to Printful</CardTitle>
           <CardDescription>Creates Printful sync product and variants.</CardDescription>
         </CardHeader>
         <CardContent className="grid gap-3">
           <div className="text-sm">
             Status: {syncQuery.data.sync?.status ?? "not synced"}
           </div>
           {syncQuery.data.sync?.lastError ? (
             <div className="text-sm text-destructive">{syncQuery.data.sync.lastError}</div>
           ) : null}
           <div className="flex items-center gap-3">
             <Button onClick={() => syncToPrintful.mutate({ productId })} disabled={syncToPrintful.isPending}>
               Sync now
             </Button>
             {syncToPrintful.isPending ? <div>Syncing...</div> : null}
           </div>
           <div className="text-xs text-muted-foreground">
             Admin token in URL: {token ? "present" : "missing"}
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }
