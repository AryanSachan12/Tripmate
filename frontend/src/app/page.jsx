"use client"
import Link from "next/link";
import Image from "next/image";
import { useUser } from "../contexts/UserContext";

export default function Home() {
  const { user, loading } = useUser();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-fuchsia-50 to-purple-50">

  <div className="relative overflow-hidden pt-10 sm:pt-14 pb-10 md:pb-16 flex-1 flex items-center">

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-400/25 to-cyan-400/25 blur-3xl" />
          <div className="absolute top-1/4 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-purple-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 to-rose-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 md:gap-12 lg:grid-cols-2">

            <div className="text-center lg:text-left">
              <div className="mx-auto inline-flex flex-wrap items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-sky-900 bg-gradient-to-r from-sky-100 via-fuchsia-100 to-purple-100 shadow-sm">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Plan smarter with AI + travel buddies
              </div>

              <h1 className="mt-6 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-gray-900">
                Make Your Next
                <span className="block bg-gradient-to-r from-sky-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Unforgettable Trip</span>
              </h1>

              <p className="mx-auto mt-4 sm:mt-5 max-w-2xl text-base sm:text-lg md:text-xl text-gray-600">
                Build adventures together, powered by AI. Discover destinations, plan effortlessly, and create memories with people who share your vibe.
              </p>

              <div className="mt-8 flex flex-col items-stretch sm:items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/explore"
                  className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-fuchsia-600 to-purple-600 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110 hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  <svg className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explore Adventures
                  <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-white/10 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                </Link>

                {!loading && !user && (
                  <Link
                    href="/auth"
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold text-gray-800 shadow-lg transition-all hover:bg-gray-50 hover:-translate-y-0.5 w-full sm:w-auto"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Sign up free
                  </Link>
                )}
              </div>

              <p className="mt-3 text-sm text-gray-500">No credit card needed • Free to start</p>


              <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900">100+</div>
                  <div className="text-sm text-gray-600">Happy Travelers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900">10+</div>
                  <div className="text-sm text-gray-600">Trips Created</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900">10+</div>
                  <div className="text-sm text-gray-600">Destinations</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900">98%</div>
                  <div className="text-sm text-gray-600">Satisfaction</div>
                </div>
              </div>
            </div>


            <div className="relative order-first mb-8 sm:-mb-10 lg:order-none lg:mb-0">
              <div className="relative mx-auto aspect-[4/3] sm:aspect-square w-full max-w-md sm:max-w-lg md:max-w-xl overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100 via-fuchsia-100 to-purple-100 shadow-2xl ring-1 ring-white/60">
                <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
                <Image src="/landing.png" alt="Trip planning preview" fill priority className="object-cover object-center" sizes="(min-width: 1024px) 36rem, (min-width: 640px) 66vw, 88vw" />
              </div>

              <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[2.125rem] bg-gradient-to-r from-sky-500/20 via-fuchsia-500/20 to-purple-500/20 blur-2xl" />
            </div>
          </div>


          <div className="mt-12 sm:mt-14 flex flex-col items-center gap-3 sm:gap-4">
            <span className="text-xs uppercase tracking-widest text-gray-500">Trusted by explorers</span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-8 opacity-70">
              <Image src="/logo.png" alt="Logo" width={90} height={18} sizes="90px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
