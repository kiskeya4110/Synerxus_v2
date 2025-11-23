import { Github, Linkedin, Twitter } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-200 py-12 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Synerxus</h3>
            <p className="text-sm text-gray-400">
              Connect. Collaborate. Impact Globally.
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Empowering global volunteers to create lasting humanitarian impact.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
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

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
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

          {/* Social Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>© {currentYear} Synerxus. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-gray-300 transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-gray-300 transition">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
