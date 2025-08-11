export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: December 2024</p>
          </div>

          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>
                We collect information you provide directly to us, such as when you create an account, plan a trip, or contact us for support.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Name and contact information (email, phone number)</li>
                <li>Profile information (photos, bio, travel preferences)</li>
                <li>Account credentials (username, password)</li>
                <li>Payment information (processed securely by third-party providers)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trip and Usage Data</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Trip itineraries, destinations, and travel dates</li>
                <li>Messages and communications within the platform</li>
                <li>Search queries and app usage patterns</li>
                <li>Device information and IP addresses</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Create and manage your account</li>
                <li>Facilitate trip planning and collaboration</li>
                <li>Send you important updates and notifications</li>
                <li>Provide customer support</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We may share your information with:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Trip Collaborators:</strong> Information you choose to share within trip groups</li>
                <li><strong>Service Providers:</strong> Third parties who assist us in operating our platform</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Secure third-party integrations</li>
              </ul>
              <p>
                However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Retention</h2>
            <p className="text-gray-700 mb-6">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. 
              You may request deletion of your account and associated data at any time through your account settings or by contacting us.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data</li>
                <li>Restrict certain uses of your information</li>
                <li>Object to data processing in certain circumstances</li>
              </ul>
              <p>
                To exercise these rights, please contact us using the information provided below or use the settings in your account.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>
                We use cookies and similar tracking technologies to enhance your experience on our platform. These technologies help us:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Remember your preferences and settings</li>
                <li>Analyze site usage and performance</li>
                <li>Provide personalized content and recommendations</li>
                <li>Maintain security and prevent fraud</li>
              </ul>
              <p>
                You can control cookie preferences through your browser settings, though some features may not work properly if cookies are disabled.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Services</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>
                Our platform may integrate with third-party services (such as maps, weather, or booking platforms) that have their own privacy policies. 
                We are not responsible for the privacy practices of these external services.
              </p>
              <p>
                We encourage you to review the privacy policies of any third-party services you use in connection with TripMate.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 mb-6">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place 
              to protect your personal information in accordance with applicable data protection laws.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 mb-6">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
              If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page 
              and updating the "Last updated" date. Your continued use of our services after any changes indicates your acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. California Privacy Rights</h2>
            <div className="text-gray-700 mb-6 space-y-4">
              <p>
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>The right to know what personal information we collect and how it's used</li>
                <li>The right to delete your personal information</li>
                <li>The right to opt-out of the sale of personal information (we do not sell personal information)</li>
                <li>The right to non-discrimination for exercising your privacy rights</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <div className="text-gray-700 mb-6">
              <p className="mb-4">If you have any questions about this Privacy Policy or our privacy practices, please contact us at:</p>
              <div className="space-y-1">
                <p><strong>Email:</strong> privacy@tripmate.com</p>
                <p><strong>Address:</strong> 123 Travel Street, Adventure City, AC 12345</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © 2024 TripMate. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
