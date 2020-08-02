/**
 * Created by rockyl on 2020-07-20.
 */

const fs = require('fs');
const {parse} = require('./src/index');

const sceneSource = fs.readFileSync('/Users/rockyl/WorkSpaces/qunity/examples/project-sample/assets/scenes/main.qnt', 'utf-8');

let doc = parse(sceneSource);
console.log(doc);
