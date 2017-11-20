
//import * as THREE from 'three';
import Util from './Util';
//import {MUSENode} from './Node';
//import {MUSE} from './MUSE';
import {MUSENode} from './Node';

// This is a base class for MUSE Nodes that correspond
// to THREE 3D objects.
// Those Node implementations should attach an Object3D
// property to this class, which is the top level THREE Object3D
// being used in the implementation of the node.
//
class Node3D extends MUSENode {

    set visible(val) {
        this.setVisible(val);
    }

    get visible() {
        this.getVisible();
    }

    setVisible(val) {
        console.log("Node3D.setVisible not implemented "+this.getClassName());
    }

    getVisible() {
        console.log("Node3D.setVisible not implemented "+this.getClassName());
        return false;
    }

    onMuseEvent(evtType, fun) {
        var obj = this.object3D;
        if (!obj) {
            alert("Cannot add MUSE events to Nodes that don't have object3D property");
            return;
        }
        if (!obj.userData) {
            obj.userData = {};
        }
        if (obj.userData[evtType]) {
            alert("Overriding existing MUSE event");
        }
        obj.userData[evtType] = fun;
    }
}

MUSENode.defineFields(Node3D, [
    "parent",
    "position",
    "scale",
    "rotation",
    "visible"
]);

export {Node3D};
