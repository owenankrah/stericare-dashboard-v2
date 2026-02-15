import React from 'react';
import { AlertTriangle, X, Eye, UserCheck } from 'lucide-react';



/**
 * DUPLICATE WARNING MODAL
 * Shows when potential duplicate customer/company/contact is detected
 * Displays who created the original entry to prevent conflicts
 */


const DuplicateWarning = ({ 
  isOpen, 
  onClose, 
  duplicateData,
  onViewExisting,
  onAddAnyway,
  darkMode 
}) => {
  if (!isOpen || !duplicateData) return null;


  
  const {
    type, // 'company', 'person', 'customer'
    name, // Duplicate name found
    createdBy, // Who added it
    createdAt, // When added
    assignee, // Who owns it
    companyName, // For people - which company they're at
    additionalMatches // Array of other potential matches
  } = duplicateData;



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className={`max-w-2xl w-full rounded-xl shadow-2xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
              <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Possible Duplicate Detected</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This {type} may already exist in the system
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main Duplicate Info */}
          <div className={`p-4 rounded-lg border-2 border-orange-300 dark:border-orange-700 ${
            darkMode ? 'bg-orange-900 bg-opacity-20' : 'bg-orange-50'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`text-lg font-semibold ${
                darkMode ? 'text-orange-300' : 'text-orange-900'
              }`}>
                "{name}"
              </div>
            </div>
            
            {companyName && (
              <div className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="font-medium">Company:</span> {companyName}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className={`font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Added By
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-blue-600" />
                  <span className="font-medium">{createdBy}</span>
                </div>
              </div>
              
              <div>
                <div className={`font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Date Added
                </div>
                <div>{createdAt}</div>
              </div>

              {assignee && (
                <>
                  <div>
                    <div className={`font-medium mb-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Assigned To
                    </div>
                    <div className="font-medium text-blue-600 dark:text-blue-400">
                      {assignee}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Matches */}
          {additionalMatches && additionalMatches.length > 0 && (
            <div>
              <div className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Other similar entries found:
              </div>
              <div className="space-y-2">
                {additionalMatches.slice(0, 3).map((match, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      darkMode 
                        ? 'border-gray-700 bg-gray-750' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{match.name}</div>
                        <div className={`text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Added by {match.createdBy} • {match.createdAt}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-750 border border-gray-700' : 'bg-gray-100 border border-gray-300'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <strong>⚠️ Important:</strong> Adding duplicate entries can cause:
            </p>
            <ul className={`text-sm mt-2 ml-4 space-y-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <li>• Confusion in sales team coordination</li>
              <li>• Multiple sales reps contacting the same {type}</li>
              <li>• Inaccurate reporting and analytics</li>
              <li>• Data quality issues</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex gap-3 p-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onViewExisting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Eye size={18} />
            View Existing Entry
          </button>
          
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            Cancel
          </button>
          
          {onAddAnyway && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to add this as a new entry despite the duplicate?')) {
                  onAddAnyway();
                }
              }}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-orange-700 hover:bg-orange-600 text-white'
                  : 'bg-orange-100 hover:bg-orange-200 text-orange-900'
              }`}
            >
              Add Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuplicateWarning;
