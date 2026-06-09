"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSeoProfile } from "@/actions/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Profile {
  businessName: string;
  description: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  openingHours: string | null;
}

export function SeoProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertSeoProfile({
        businessName: String(f.get("businessName") ?? ""),
        description: String(f.get("description") ?? ""),
        street: String(f.get("street") ?? ""),
        postalCode: String(f.get("postalCode") ?? ""),
        city: String(f.get("city") ?? ""),
        country: String(f.get("country") ?? "DE"),
        phone: String(f.get("phone") ?? ""),
        website: String(f.get("website") ?? ""),
        category: String(f.get("category") ?? ""),
        openingHours: String(f.get("openingHours") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Gespeichert.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="businessName">Firmenname</Label>
          <Input id="businessName" name="businessName" defaultValue={profile?.businessName ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Kategorie (schema.org)</Label>
          <Input id="category" name="category" placeholder="Restaurant, Store, …" defaultValue={profile?.category ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" defaultValue={profile?.website ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="street">Straße & Nr.</Label>
          <Input id="street" name="street" defaultValue={profile?.street ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="postalCode">PLZ</Label>
            <Input id="postalCode" name="postalCode" defaultValue={profile?.postalCode ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ort</Label>
            <Input id="city" name="city" defaultValue={profile?.city ?? ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Land (ISO-2)</Label>
          <Input id="country" name="country" maxLength={2} defaultValue={profile?.country ?? "DE"} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={profile?.description ?? ""}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="openingHours">Öffnungszeiten (eine Zeile pro Angabe)</Label>
        <textarea
          id="openingHours"
          name="openingHours"
          rows={3}
          placeholder={"Mo-Fr 09:00-18:00\nSa 09:00-14:00"}
          defaultValue={profile?.openingHours ?? ""}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
      <Button type="submit" disabled={isPending}>
        Profil speichern
      </Button>
    </form>
  );
}
