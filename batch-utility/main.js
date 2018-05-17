var path = require('path');
const electron = require('electron');
const {app, BrowserWindow} = electron;
const Store = require('electron-store');

let win;

const store = new Store({
  name: 'user-settings',
  defaults: {
    windowBounds: { width: 1600, height: 800 }
  }
});


function createWindow () {
  let { width, height } = store.get('windowBounds');
  win = new BrowserWindow({
    width: width, 
    height: height,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'icons/png/64x64.png')
  })

  //win.loadURL('http://localhost:4200');
  win.loadURL(`file://${__dirname}/dist/index.html`)

  win.on('resize', () => {
    let { width, height } = win.getBounds();
    store.set('windowBounds', { width, height });
  });

  win.on('closed', function () {
    win = null
  })
}

app.on('ready', createWindow)
//app.on('ready', ()=>{setTimeout(createWindow, 10000)})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (win === null) {
    createWindow()
  }
})