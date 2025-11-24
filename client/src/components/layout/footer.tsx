import { Github, Linkedin, Twitter } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-200 py-3 border-t border-gray-800 mt-6">
      <div className="max-w-full mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Brand & Links Section */}
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Synerxus</h3>
              <p className="text-[11px] text-gray-400">
                Connect. Collaborate. Impact Globally.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-white mb-1">Platform & Resources</h4>
              <ul className="space-y-0.5 text-[11px] text-gray-400">
                <li>
                  <a href="/dashboard" className="hover:text-white transition">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="/discover-opportunities" className="hover:text-white transition">
                    Opportunities
                  </a>
                </li>
                <li>
                  <a href="/organizations" className="hover:text-white transition">
                    Organizations
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Resources & Social Links Section */}
          <div className="space-y-2">
            <div>
              <h4 className="text-[11px] font-semibold text-white mb-1">Help</h4>
              <ul className="space-y-0.5 text-[11px] text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-white mb-1">Follow Us</h4>
              <div className="flex gap-2">
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-2">
          <div className="flex flex-col md:flex-row justify-between items-center text-[11px] text-gray-500 gap-2">
            <p>© {currentYear} Synerxus. All rights reserved.</p>
            <div className="flex gap-4 text-[11px]">
              <a href="#" className="hover:text-gray-300 transition">
                Privacy
              </a>
              <a href="#" className="hover:text-gray-300 transition">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
