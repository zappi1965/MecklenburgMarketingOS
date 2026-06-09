import { redirect } from "next/navigation";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingServices, bookingSlots } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { BookingAdmin } from "@/components/booking/booking-admin";

export default async function BookingPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "booking:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const now = new Date();
  const [services, slots, bookingRows] = await Promise.all([
    db
      .select()
      .from(bookingServices)
      .where(eq(bookingServices.tenantId, tenantId)),
    db
      .select({
        id: bookingSlots.id,
        startsAt: bookingSlots.startsAt,
        capacity: bookingSlots.capacity,
        bookedCount: bookingSlots.bookedCount,
        serviceName: bookingServices.name,
      })
      .from(bookingSlots)
      .innerJoin(
        bookingServices,
        eq(bookingSlots.serviceId, bookingServices.id),
      )
      .where(and(eq(bookingSlots.tenantId, tenantId), gt(bookingSlots.startsAt, now)))
      .orderBy(asc(bookingSlots.startsAt))
      .limit(50),
    db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        status: bookings.status,
        code: bookings.code,
        startsAt: bookingSlots.startsAt,
        serviceName: bookingServices.name,
      })
      .from(bookings)
      .innerJoin(bookingSlots, eq(bookings.slotId, bookingSlots.id))
      .innerJoin(bookingServices, eq(bookings.serviceId, bookingServices.id))
      .where(eq(bookings.tenantId, tenantId))
      .orderBy(desc(bookings.createdAt))
      .limit(100),
  ]);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${base}/book/${ctx.tenant.slug}`;

  return (
    <ToolGuard toolKey="booking" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking</h1>
          <p className="text-sm text-muted-foreground">
            Services, Slots und Buchungen von {ctx.tenant.name}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Öffentlicher Buchungslink</CardTitle>
            <CardDescription>Teile diesen Link mit deinen Kunden.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
          </CardContent>
        </Card>

        <BookingAdmin
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
          }))}
          slots={slots}
          bookings={bookingRows}
          canManage={can(ctx, "booking:manage")}
          canOperate={can(ctx, "booking:operate")}
        />
      </div>
    </ToolGuard>
  );
}
