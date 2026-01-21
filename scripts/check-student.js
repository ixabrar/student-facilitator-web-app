// Check student and courses in browser console
// Open browser console (F12) and paste this

async function checkStudent() {
  const token = localStorage.getItem('authToken')
  
  // Get current user
  const userRes = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const userData = await userRes.json()
  console.log('👤 Current User:', userData)
  
  // Get profile
  const profileRes = await fetch('/api/profiles?userId=' + userData.id, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const profiles = await profileRes.json()
  console.log('📋 User Profile:', profiles[0])
  
  // Get enrollments
  const enrollRes = await fetch('/api/enrollments?studentId=' + userData.id, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const enrollments = await enrollRes.json()
  console.log('📚 Enrollments:', enrollments)
  
  // Get each course details
  for (const enroll of enrollments) {
    const courseRes = await fetch('/api/courses?_id=' + enroll.courseId, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const courses = await courseRes.json()
    if (courses.length > 0) {
      console.log(`📖 Course: ${courses[0].name}`)
      console.log(`   Department: ${courses[0].departmentId}`)
      console.log(`   Match: ${courses[0].departmentId === profiles[0].department ? '✅' : '❌'}`)
    }
  }
}

checkStudent()
