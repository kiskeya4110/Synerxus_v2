import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-muted-foreground mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Synerxus, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">2. Use of Service</h2>
              <p>
                Synerxus is a platform designed to connect volunteers with organizations and corporate partners
                for meaningful volunteer opportunities. You agree to use the service only for lawful purposes
                and in accordance with these terms.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for
                all activities that occur under your account. You must provide accurate and complete information
                when creating your account.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
              <p>Users agree not to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Post false or misleading information</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use the platform for any illegal purposes</li>
                <li>Attempt to gain unauthorized access to other accounts</li>
                <li>Interfere with the proper functioning of the platform</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
              <p>
                All content and materials on Synerxus, including but not limited to text, graphics, logos,
                and software, are the property of Synerxus or its licensors and are protected by intellectual
                property laws.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
              <p>
                Synerxus provides the platform "as is" and makes no warranties regarding the availability,
                accuracy, or reliability of the service. We are not liable for any indirect, incidental,
                or consequential damages arising from your use of the platform.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Changes will be effective immediately
                upon posting. Your continued use of the platform after changes constitutes acceptance of the
                modified terms.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:support@synerxus.com" className="text-primary-600 hover:underline">
                  support@synerxus.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
