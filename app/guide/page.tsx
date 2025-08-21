'use client';

import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
import EnhancedNavigation from '@/components/EnhancedNavigation';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I add a new client?",
    answer: "Click the 'Add Client' button on the dashboard, fill in the required fields (Client Code, Client Name, Full Name, and Folder ID), and click 'Add Client'. The system will automatically sync with Google Sheets."
  },
  {
    question: "How do I update client information?",
    answer: "Click the edit icon (pencil) next to any client in the list. You can modify the client name, full name, ACOS goal, TACOS goal, or active status. Click 'Save' to update the information."
  },
  {
    question: "What file formats are supported for data import?",
    answer: "The system supports Excel files (.xlsx, .xls), CSV files, and Google Sheets. For Google Sheets, the system will first attempt to download as Excel format to preserve tab structure, then fall back to CSV if needed."
  },
  {
    question: "How do I reset my password?",
    answer: "Click 'Forgot Password' on the login page, enter your email address, and follow the instructions sent to your email. You'll receive a reset code to create a new password."
  },
  {
    question: "What is the difference between ACOS and TACOS?",
    answer: "ACOS (Advertising Cost of Sales) measures advertising spend as a percentage of sales. TACOS (Total Advertising Cost of Sales) includes all advertising costs. Both are important metrics for Amazon advertising performance."
  },
  {
    question: "How do I access the audit logs?",
    answer: "Navigate to the Audit section in the main menu. You can view all user actions, login attempts, and system events. The audit logs help maintain security and track user activity."
  },
  {
    question: "Can I export data from the system?",
    answer: "Yes, the system integrates with Google Sheets for data management. All client data is automatically synced with your configured Google Sheets document."
  },
  {
    question: "What should I do if I encounter an error?",
    answer: "First, try refreshing the page. If the error persists, check your internet connection and ensure all required fields are filled. For persistent issues, contact your system administrator."
  }
];

export default function GuidePage() {
  // const router = useRouter();
  const [activeTab, setActiveTab] = useState('getting-started');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string; role?: string } | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="guide" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'getting-started', name: 'Getting Started' },
              { id: 'features', name: 'Features' },
              { id: 'troubleshooting', name: 'Troubleshooting' },
              { id: 'faq', name: 'FAQ' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Getting Started */}
          {activeTab === 'getting-started' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Cambria Dashboard</h2>
                <p className="text-gray-600 mb-6">
                  Cambria Dashboard is a comprehensive client management system designed for Amazon sellers. 
                  This guide will help you get started and make the most of the platform.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Quick Start Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600">
                      <li>Log in to your account using your email and password</li>
                      <li>Review the dashboard to see your current clients</li>
                      <li>Add your first client using the &quot;Add Client&quot; button</li>
                      <li>Configure your settings in the Settings page</li>
                      <li>Upload your data files for analysis</li>
                    </ol>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Key Features</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Client management with Google Sheets integration</li>
                      <li>File parsing for Excel, CSV, and Google Sheets</li>
                      <li>Audit logging for security and compliance</li>
                      <li>User authentication and password management</li>
                      <li>Responsive design for mobile and desktop</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Requirements</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Browser Requirements</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Chrome 90+</li>
                      <li>Firefox 88+</li>
                      <li>Safari 14+</li>
                      <li>Edge 90+</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">File Format Support</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Excel (.xlsx, .xls)</li>
                      <li>CSV files</li>
                      <li>Google Sheets</li>
                      <li>Maximum file size: 50MB</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          {activeTab === 'features' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Core Features</h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Client Management */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Client Management</h3>
                    </div>
                    <p className="text-gray-600">
                      Add, edit, and manage your clients with comprehensive information including 
                      client codes, names, goals, and status tracking.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Add new clients with required information</li>
                      <li>Edit existing client details</li>
                      <li>Track ACOS and TACOS goals</li>
                      <li>Toggle client active/inactive status</li>
                    </ul>
                  </div>

                  {/* File Processing */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">File Processing</h3>
                    </div>
                    <p className="text-gray-600">
                      Upload and process various file formats with advanced parsing capabilities 
                      for Excel, CSV, and Google Sheets.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Support for Excel (.xlsx, .xls) files</li>
                      <li>CSV file processing</li>
                      <li>Google Sheets integration</li>
                      <li>Multi-tab Excel processing</li>
                    </ul>
                  </div>

                  {/* Security & Audit */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Security & Audit</h3>
                    </div>
                    <p className="text-gray-600">
                      Comprehensive security features with audit logging to track all user actions 
                      and maintain compliance.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>User authentication and authorization</li>
                      <li>Password reset functionality</li>
                      <li>Audit log tracking</li>
                      <li>Session management</li>
                    </ul>
                  </div>

                  {/* Data Integration */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Data Integration</h3>
                    </div>
                    <p className="text-gray-600">
                      Seamless integration with Google Sheets for data management and synchronization 
                      across platforms.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Google Sheets API integration</li>
                      <li>Automatic data synchronization</li>
                      <li>Real-time updates</li>
                      <li>Backup and restore capabilities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {activeTab === 'troubleshooting' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Common Issues & Solutions</h2>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-yellow-400 pl-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Login Issues</h3>
                    <p className="text-gray-600 mb-2">If you&apos;re having trouble logging in:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Ensure your email and password are correct</li>
                      <li>Check that Caps Lock is not enabled</li>
                      <li>Clear your browser cache and cookies</li>
                      <li>Try using a different browser</li>
                      <li>Use the &quot;Forgot Password&quot; feature if needed</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-red-400 pl-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">File Upload Problems</h3>
                    <p className="text-gray-600 mb-2">If files aren&apos;t uploading properly:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Check that the file format is supported (.xlsx, .xls, .csv)</li>
                      <li>Ensure the file size is under 50MB</li>
                      <li>Verify the file is not corrupted</li>
                      <li>Try uploading a smaller test file first</li>
                      <li>Check your internet connection</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-blue-400 pl-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Data Sync Issues</h3>
                    <p className="text-gray-600 mb-2">If Google Sheets sync isn&apos;t working:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Verify your Google Sheets permissions</li>
                      <li>Check that the spreadsheet ID is correct</li>
                      <li>Ensure the service account has proper access</li>
                      <li>Try refreshing the page</li>
                      <li>Contact your administrator for API key issues</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-green-400 pl-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Issues</h3>
                    <p className="text-gray-600 mb-2">If the system seems slow:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Close unnecessary browser tabs</li>
                      <li>Clear browser cache and cookies</li>
                      <li>Try using a different browser</li>
                      <li>Check your internet connection speed</li>
                      <li>Reduce the number of items displayed per page</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h3>
                <p className="text-gray-600 mb-4">
                  If you&apos;re still experiencing issues after trying the solutions above, 
                  please contact your system administrator with the following information:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Your email address</li>
                  <li>Browser and version</li>
                  <li>Operating system</li>
                  <li>Detailed description of the issue</li>
                  <li>Steps to reproduce the problem</li>
                  <li>Any error messages you see</li>
                </ul>
              </div>
            </div>
          )}

          {/* FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
                
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${
                            expandedFaq === index ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedFaq === index && (
                        <div className="px-4 pb-3">
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
