const { ExhibitionsService } = require('./lib/services/exhibitions.service');

async function test() {
  const srv = new ExhibitionsService();
  try {
    await srv.createExhibition(
      {
        name: 'Test Event',
        location: 'Test Loc',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        assignedUserId: null,
        items: [{ bookId: '123', quantityTaken: 5 }]
      },
      { userId: '123', branchId: '123' },
      '127.0.0.1'
    );
    console.log('Success');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
