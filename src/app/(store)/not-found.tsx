import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StoreNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4 py-24">
      <div className="mx-auto max-w-md text-center">
        {/* Illustration */}
        <div className="mb-8 text-[120px] leading-none">
          <span role="img" aria-label="Lost">
            🛍️
          </span>
        </div>

        {/* 404 Badge */}
        <div className="mb-4 inline-block rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-semibold text-yellow-700">
          404 Error
        </div>

        {/* Heading */}
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Page Not Found
        </h1>

        {/* Subtitle */}
        <p className="mb-8 text-base text-muted-foreground leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved. Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full bg-yellow-500 text-gray-900 font-semibold hover:bg-yellow-400 sm:w-auto">
            <Link href="/">Go to Homepage</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
