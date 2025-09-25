import Image from 'next/image';
import dynamic from 'next/dynamic';

const NotFoundClient = dynamic(() => import('@/components/not-found-client'), {
  ssr: false,
});

export default function NotFound() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-24 h-24 md:w-32 md:h-32">
            <Image
              src="/Studify App Logo Design.png"
              alt="Studify Logo"
              width={128}   
              height={128}
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        {/* Error Code with Animation */}
        <div className="mb-6">
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text animate-pulse">
            404
          </h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Error 404
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 dark:border-slate-700/20 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Page Not Found
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
            Oops! The page you're looking for doesn't exist
          </p>
          
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-8 leading-relaxed">
            The link you followed may be broken, or the page may have been removed.
          </p>

          {/* Client-side Interactive Components */}
          <NotFoundClient />
        </div>

        {/* Floating Animation Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Floating circles with different delays and sizes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-indigo-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '1s', animationDuration: '4s' }} />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-purple-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '0.5s', animationDuration: '5s' }} />
          <div className="absolute top-1/3 left-1/2 w-20 h-20 bg-cyan-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
        </div>

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 -z-20 opacity-5">
          <div className="absolute inset-0" 
               style={{
                 backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
                 backgroundSize: '20px 20px'
               }} />
        </div>
      </div>
    </div>
  );
}
