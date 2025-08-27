const fetch = require('node-fetch');

// Debug script for client page data issues
async function debugClientPage() {
  console.log('🔍 Debugging Client Page Data Issues...\n');

  const baseUrl = 'http://localhost:3000';
  const clientCode = 'WON'; // The client code you're having issues with

  try {
    // Test 1: Check if the server is running
    console.log('📡 Test 1: Checking server connectivity...');
    const response = await fetch(baseUrl);
    
    if (response.ok) {
      console.log('✅ Server is running and responding');
    } else {
      console.log(`❌ Server responded with status: ${response.status}`);
      return;
    }

    // Test 2: Get client information
    console.log('\n📡 Test 2: Getting client information...');
    const clientsResponse = await fetch(`${baseUrl}/api/clients`);
    
    if (clientsResponse.ok) {
      const clientsData = await clientsResponse.json();
      const client = clientsData.clients.find(c => c.clientCode === clientCode);
      
      if (client) {
        console.log('✅ Client found:', {
          clientCode: client.clientCode,
          clientName: client.clientName,
          fullName: client.fullName,
          folderId: client.folderId,
          active: client.active
        });

        // Test 3: Check folder data
        console.log('\n📡 Test 3: Checking folder data...');
        const folderResponse = await fetch(`${baseUrl}/api/folder/${client.folderId}`);
        
        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          console.log('✅ Folder data retrieved:', {
            itemsCount: folderData.items?.length || 0,
            items: folderData.items?.slice(0, 5).map(item => ({
              name: item.name,
              mimeType: item.mimeType,
              id: item.id
            })) || []
          });

          // Test 4: Check for monthly report folders
          const monthlyFolders = folderData.items?.filter(item => 
            item.mimeType === 'application/vnd.google-apps.folder' &&
            /^\d{4}-\d{2}$/.test(item.name)
          ) || [];

          console.log('\n📊 Monthly folders found:', monthlyFolders.length);
          monthlyFolders.forEach(folder => {
            console.log(`  - ${folder.name} (ID: ${folder.id})`);
          });

          if (monthlyFolders.length > 0) {
            // Test 5: Check first monthly folder contents
            const firstMonthFolder = monthlyFolders[0];
            console.log(`\n📡 Test 5: Checking contents of ${firstMonthFolder.name}...`);
            
            const monthFolderResponse = await fetch(`${baseUrl}/api/folder/${firstMonthFolder.id}`);
            
            if (monthFolderResponse.ok) {
              const monthFolderData = await monthFolderResponse.json();
              console.log('✅ Monthly folder contents:', {
                itemsCount: monthFolderData.items?.length || 0,
                items: monthFolderData.items?.map(item => ({
                  name: item.name,
                  mimeType: item.mimeType,
                  id: item.id
                })) || []
              });

              // Test 6: Check for monthly report files
              const monthlyReportFiles = monthFolderData.items?.filter(item => 
                item.name.toLowerCase().includes('monthly-report')
              ) || [];

              console.log('\n📄 Monthly report files found:', monthlyReportFiles.length);
              monthlyReportFiles.forEach(file => {
                console.log(`  - ${file.name} (ID: ${file.id})`);
              });

              if (monthlyReportFiles.length > 0) {
                // Test 7: Try to fetch report data
                const firstReportFile = monthlyReportFiles[0];
                console.log(`\n📡 Test 7: Fetching report data from ${firstReportFile.name}...`);
                
                const reportResponse = await fetch(`${baseUrl}/api/file/${firstReportFile.id}?userId=test&clientCode=${clientCode}`);
                
                if (reportResponse.ok) {
                  const reportData = await reportResponse.json();
                  console.log('✅ Report data retrieved successfully');
                  console.log('Report structure:', Object.keys(reportData));
                  
                  if (reportData.profitLoss) {
                    console.log('Profit/Loss data available');
                  }
                  if (reportData.productPerformance) {
                    console.log(`Product performance data: ${reportData.productPerformance.length} products`);
                  }
                  if (reportData.amazonPerformance) {
                    console.log('Amazon performance data available');
                  }
                } else {
                  const errorData = await reportResponse.json();
                  console.log('❌ Report data fetch failed:', {
                    status: reportResponse.status,
                    error: errorData.error
                  });
                }
              } else {
                console.log('⚠️ No monthly report files found in the folder');
              }
            } else {
              const errorData = await monthFolderResponse.json();
              console.log('❌ Monthly folder fetch failed:', {
                status: monthFolderResponse.status,
                error: errorData.error
              });
            }
          } else {
            console.log('⚠️ No monthly folders found');
          }
        } else {
          const errorData = await folderResponse.json();
          console.log('❌ Folder fetch failed:', {
            status: folderResponse.status,
            error: errorData.error
          });
        }
      } else {
        console.log(`❌ Client ${clientCode} not found`);
        console.log('Available clients:', clientsData.clients?.map(c => c.clientCode) || []);
      }
    } else {
      const errorData = await clientsResponse.json();
      console.log('❌ Clients fetch failed:', {
        status: clientsResponse.status,
        error: errorData.error
      });
    }

  } catch (error) {
    console.error('❌ Debug failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the development server is running:');
      console.error('npm run dev');
    }
  }

  console.log('\n🔍 Debug Summary:');
  console.log('1. Check if the client exists in the system');
  console.log('2. Verify the folder ID is correct');
  console.log('3. Ensure the folder contains monthly report folders (YYYY-MM format)');
  console.log('4. Check if monthly folders contain files with "monthly-report" in the name');
  console.log('5. Verify the file API can process the report files');
  console.log('6. Check browser console for any JavaScript errors');
  console.log('7. Verify user permissions for the client');
}

// Run the debug
debugClientPage().catch(console.error);

