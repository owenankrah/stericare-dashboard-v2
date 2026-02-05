import React, { useState } from "react";
import { X, Phone, Mail, MapPin, Building } from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "interactions", label: "Interactions" },
  { key: "notes", label: "Notes" },
  { key: "opportunities", label: "Opportunities" },
  { key: "purchases", label: "Purchase History" },
  { key: "credit", label: "Credit Summary" },
];

const CustomerDetailDrawer = ({ customer, open, onClose, darkMode }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 flex justify-end z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`relative w-full max-w-2xl h-full shadow-xl transform transition-all duration-300 
        ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
      >
        {/* Header */}
        <div
          className={`flex justify-between items-center px-6 py-4 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div>
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            <p className="text-sm text-gray-500">{customer.customer_type}</p>
          </div>

          <button onClick={onClose}>
            <X size={24} className={darkMode ? "text-gray-300" : "text-gray-600"} />
          </button>
        </div>

        {/* Zoho-Style Tabs */}
        <div
          className={`flex gap-6 px-6 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : darkMode
                  ? "border-transparent text-gray-400 hover:text-gray-200"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-130px)]">
          {activeTab === "overview" && <OverviewTab customer={customer} darkMode={darkMode} />}
          {activeTab === "interactions" && <InteractionsTab customer={customer} darkMode={darkMode} />}
          {activeTab === "notes" && <NotesTab customer={customer} darkMode={darkMode} />}
          {activeTab === "opportunities" && <OpportunitiesTab customer={customer} darkMode={darkMode} />}
          {activeTab === "purchases" && <PurchaseHistoryTab customer={customer} darkMode={darkMode} />}
          {activeTab === "credit" && <CreditSummaryTab customer={customer} darkMode={darkMode} />}
        </div>
      </div>
    </div>
  );
};

// --- Placeholder components (will be replaced with full implementations) ---
const PlaceholderCard = ({ title }) => (
  <div className="border rounded-lg p-4 text-sm text-gray-500">
    {title} feature implementation goes here…
  </div>
);

const OverviewTab = ({ customer }) => (
  <PlaceholderCard title={`Overview for ${customer.name}`} />
);
const InteractionsTab = ({ customer }) => (
  <PlaceholderCard title={`Interactions for ${customer.name}`} />
);
const NotesTab = ({ customer }) => (
  <PlaceholderCard title={`Notes for ${customer.name}`} />
);
const OpportunitiesTab = ({ customer }) => (
  <PlaceholderCard title={`Opportunities for ${customer.name}`} />
);
const PurchaseHistoryTab = ({ customer }) => (
  <PlaceholderCard title={`Purchase history for ${customer.name}`} />
);
const CreditSummaryTab = ({ customer }) => (
  <PlaceholderCard title={`Credit summary for ${customer.name}`} />
);

export default CustomerDetailDrawer;
