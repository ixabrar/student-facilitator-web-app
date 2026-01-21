// Cleanup script for wrong enrollments
// Run this in your browser console while logged in as admin

async function cleanupEnrollments() {
  const token = localStorage.getItem('authToken')
  
  if (!token) {
    console.error('❌ No auth token found. Please login first.')
    return
  }

  console.log('🔍 Checking for mismatched enrollments...')
  
  try {
    // Check mismatches first
    const checkResponse = await fetch('/api/admin/cleanup-enrollments', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!checkResponse.ok) {
      const error = await checkResponse.json()
      console.error('❌ Error:', error)
      return
    }
    
    const data = await checkResponse.json()
    console.log('📊 Cleanup Report:')
    console.log(`   Total enrollments: ${data.totalEnrollments}`)
    console.log(`   Mismatched enrollments: ${data.mismatches}`)
    
    if (data.mismatches > 0) {
      console.log('\n🔧 Found mismatches:')
      data.details.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.studentName} (${item.studentDepartment}) enrolled in ${item.courseName} (${item.courseDepartment})`)
      })
      
      console.log('\n⚠️  Do you want to delete these mismatched enrollments?')
      console.log('   Run: deleteWrongEnrollments()')
    } else {
      console.log('✅ No mismatched enrollments found!')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function deleteWrongEnrollments() {
  const token = localStorage.getItem('authToken')
  
  if (!token) {
    console.error('❌ No auth token found. Please login first.')
    return
  }

  console.log('🗑️  Deleting mismatched enrollments...')
  
  try {
    const deleteResponse = await fetch('/api/admin/cleanup-enrollments', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!deleteResponse.ok) {
      const error = await deleteResponse.json()
      console.error('❌ Error:', error)
      return
    }
    
    const result = await deleteResponse.json()
    console.log('✅ Cleanup complete!')
    console.log(`   Deleted ${result.deletedCount} mismatched enrollments`)
    console.log('\n🔄 Please refresh the page to see the changes.')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Auto-run check
cleanupEnrollments()

// Make functions available globally
window.cleanupEnrollments = cleanupEnrollments
window.deleteWrongEnrollments = deleteWrongEnrollments
