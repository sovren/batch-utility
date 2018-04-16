const electron = require('electron')
const {app, BrowserWindow} = electron
const Store = require('electron-store');

let win;

const store = new Store({
  // We'll call our data file 'user-settings'
  name: 'user-settings',
  defaults: {
    // 800x600 is the default size of our window
    windowBounds: { width: 1600, height: 800 }
  }
});


function createWindow () {
  // Create the browser window.
  let { width, height } = store.get('windowBounds');
  win = new BrowserWindow({
    //frame: false,
    width: width, 
    height: height,
    backgroundColor: '#ffffff',
    icon: `file://${__dirname}/dist/assets/icons/128x128.png`
  })

 // Specify entry point
    win.loadURL('http://localhost:4200');
  //win.loadURL(`file://${__dirname}/dist/index.html`)

  // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
  // to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
  win.on('resize', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = win.getBounds();
    // Now that we have them, save them using the `set` method.
    store.set('windowBounds', { width, height });
  });

  // Event when the window is closed.
  win.on('closed', function () {
    win = null
  })
}

// Create window on electron intialization
app.on('ready', ()=>{setTimeout(createWindow, 10000)})

// Quit when all windows are closed.
app.on('window-all-closed', function () {

  // On macOS specific close process
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // macOS specific close process
  if (win === null) {
    createWindow()
  }
})