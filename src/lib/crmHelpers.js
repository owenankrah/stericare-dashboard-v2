/**
 * CRM HELPER FUNCTIONS
 * Add these to your CRM module for duplicate detection
 */

import { supabase } from '../lib/supabase';

/**
 * Check for duplicate companies
 * @param {string} companyName - Name to check
 * @param {string} excludeId - ID to exclude from check (for edits)
 * @returns {Promise<Array>} - Array of potential duplicates
 */
export const checkDuplicateCompany = async (companyName, excludeId = null) => {
  try {
    if (!companyName || companyName.trim().length < 3) {
      return []; // Don't check very short names
    }

    // Check in crm_companies table
    let query = supabase
      .from('crm_companies')
      .select(`
        id,
        name,
        created_by,
        created_at,
        assignee,
        tag,
        contact_type
      `)
      .ilike('name', `%${companyName.trim()}%`)
      .limit(5);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: crmMatches, error: crmError } = await query;
    if (crmError) throw crmError;

    // Also check in old customers table
    let customerQuery = supabase
      .from('customers')
      .select(`
        id,
        name,
        created_at,
        customer_type,
        region
      `)
      .ilike('name', `%${companyName.trim()}%`)
      .limit(5);

    const { data: customerMatches, error: customerError } = await customerQuery;
    if (customerError) throw customerError;

    // Combine and enrich results
    const allMatches = [];

    // Process CRM companies
    for (const match of crmMatches || []) {
      // Get creator name
      let creatorName = 'Unknown';
      if (match.created_by) {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', match.created_by)
          .single();
        
        if (userData) {
          creatorName = userData.full_name || userData.email;
        }
      }

      allMatches.push({
        id: match.id,
        name: match.name,
        createdBy: creatorName,
        createdAt: new Date(match.created_at).toLocaleDateString(),
        assignee: match.assignee || 'Unassigned',
        tag: match.tag,
        source: 'crm_companies',
        type: 'company'
      });
    }

    // Process customers
    for (const match of customerMatches || []) {
      allMatches.push({
        id: match.id,
        name: match.name,
        createdBy: 'System',
        createdAt: new Date(match.created_at).toLocaleDateString(),
        assignee: match.region || 'N/A',
        tag: match.customer_type,
        source: 'customers',
        type: 'customer'
      });
    }

    return allMatches;
  } catch (error) {
    console.error('Error checking duplicate company:', error);
    return [];
  }
};

/**
 * Check for duplicate people/contacts
 * @param {string} personName - Name to check
 * @param {string} excludeId - ID to exclude from check (for edits)
 * @returns {Promise<Array>} - Array of potential duplicates
 */
export const checkDuplicatePerson = async (personName, excludeId = null) => {
  try {
    if (!personName || personName.trim().length < 3) {
      return [];
    }

    let query = supabase
      .from('crm_people')
      .select(`
        id,
        full_name,
        company_name,
        created_by,
        created_at,
        tag,
        title,
        work_email
      `)
      .ilike('full_name', `%${personName.trim()}%`)
      .limit(5);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with creator names
    const enrichedMatches = [];
    for (const match of data || []) {
      let creatorName = 'Unknown';
      if (match.created_by) {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', match.created_by)
          .single();
        
        if (userData) {
          creatorName = userData.full_name || userData.email;
        }
      }

      enrichedMatches.push({
        id: match.id,
        name: match.full_name,
        companyName: match.company_name || 'No company',
        createdBy: creatorName,
        createdAt: new Date(match.created_at).toLocaleDateString(),
        tag: match.tag,
        title: match.title,
        email: match.work_email,
        type: 'person'
      });
    }

    return enrichedMatches;
  } catch (error) {
    console.error('Error checking duplicate person:', error);
    return [];
  }
};

/**
 * Check for duplicate opportunities
 * @param {string} opportunityName - Name to check
 * @param {string} companyId - Company ID to check within
 * @param {string} excludeId - ID to exclude from check (for edits)
 * @returns {Promise<Array>} - Array of potential duplicates
 */
export const checkDuplicateOpportunity = async (opportunityName, companyId = null, excludeId = null) => {
  try {
    if (!opportunityName || opportunityName.trim().length < 3) {
      return [];
    }

    let query = supabase
      .from('crm_opportunities')
      .select(`
        id,
        name,
        company_name,
        stage,
        value,
        created_by,
        created_at,
        assignee
      `)
      .ilike('name', `%${opportunityName.trim()}%`)
      .limit(5);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with creator names
    const enrichedMatches = [];
    for (const match of data || []) {
      let creatorName = 'Unknown';
      if (match.created_by) {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', match.created_by)
          .single();
        
        if (userData) {
          creatorName = userData.full_name || userData.email;
        }
      }

      enrichedMatches.push({
        id: match.id,
        name: match.name,
        companyName: match.company_name || 'No company',
        stage: match.stage,
        value: match.value,
        createdBy: creatorName,
        createdAt: new Date(match.created_at).toLocaleDateString(),
        assignee: match.assignee || 'Unassigned',
        type: 'opportunity'
      });
    }

    return enrichedMatches;
  } catch (error) {
    console.error('Error checking duplicate opportunity:', error);
    return [];
  }
};

/**
 * Format duplicate data for DuplicateWarning component
 * @param {Array} matches - Array of duplicate matches
 * @param {string} type - Type: 'company', 'person', 'opportunity'
 * @returns {Object} - Formatted data for modal
 */
export const formatDuplicateData = (matches, type) => {
  if (!matches || matches.length === 0) return null;

  const primary = matches[0];
  const additional = matches.slice(1);

  return {
    type,
    name: primary.name,
    createdBy: primary.createdBy,
    createdAt: primary.createdAt,
    assignee: primary.assignee,
    companyName: primary.companyName,
    tag: primary.tag,
    additionalMatches: additional.map(m => ({
      name: m.name,
      createdBy: m.createdBy,
      createdAt: m.createdAt,
      companyName: m.companyName
    }))
  };
};

/**
 * Similarity score between two strings (0-1)
 * Uses Levenshtein distance
 */
export const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Levenshtein distance algorithm
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Example usage in your CRM component:
 * 
 * import DuplicateWarning from './DuplicateWarning';
 * import { checkDuplicateCompany, formatDuplicateData } from '../lib/crmHelpers';
 * 
 * const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
 * const [duplicateData, setDuplicateData] = useState(null);
 * 
 * const handleCompanyNameBlur = async (name) => {
 *   const matches = await checkDuplicateCompany(name);
 *   if (matches.length > 0) {
 *     setDuplicateData(formatDuplicateData(matches, 'company'));
 *     setShowDuplicateWarning(true);
 *   }
 * };
 * 
 * // In your render:
 * <DuplicateWarning
 *   isOpen={showDuplicateWarning}
 *   onClose={() => setShowDuplicateWarning(false)}
 *   duplicateData={duplicateData}
 *   onViewExisting={() => {
 *     // Navigate to existing record
 *     setShowDuplicateWarning(false);
 *   }}
 *   darkMode={darkMode}
 * />
 */
