import OBJLoader from '../lib/loaders/OBJLoader';
import * as THREE from 'three';
import ViveController from '../lib/vr/ViveController';

import 'yuki-createjs/lib/tweenjs-0.6.2.combined';

const {degToRad} = THREE.Math;

const VIVE_PATH = 'models/vive-controller/';
const OBJ_NAME = 'vr_controller_vive_1_5.obj';
const TEXTURE_NAME = 'onepointfive_texture.png';
const SPEC_MAP_NAME = 'onepointfive_spec.png';
const SPEED = 1 / 500; // one unit per sec

const OCULUS_PATH = 'models/oculus-controller/';
const OCULUS_LEFT_OBJ = 'oculus_cv1_controller_left.obj';
const OCULUS_RIGHT_OBJ = 'oculus_cv1_controller_right.obj';
const OCULUS_TEXTURE_NAME = 'external_controller01_col.png';
const OCULUS_SPEC_MAP_NAME = 'external_controller01_spec.png';


function loadAll(loaderFilePairs) {
    return Promise.all(
        loaderFilePairs.map(
            ({loader, file}) => (
                new Promise((resolve) => {
                    loader.load(file, resolve);
                })
            )
        )
    );
}

export default class ViveControllerController {

    constructor(scene, body) {
        this.scene = scene;
        this.body = body;

        this.controller0 = new ViveController(0);
        this.controller1 = new ViveController(1);

        this.body.add(this.controller0);
        this.body.add(this.controller1);

        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();

        let lineGeometry = new THREE.Geometry();
        lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
        lineGeometry.vertices.push(new THREE.Vector3(0, 0, -1));
        let lineMaterial = new THREE.LineBasicMaterial({color: 0x000000});

        this.line = new THREE.Line(lineGeometry, lineMaterial);
        this.line.name = 'line';
        this.line.scale.z = 12;

        let circleGeometry = new THREE.CircleGeometry(0.1, 32);
        let circleMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
        this.selector = new THREE.Mesh(circleGeometry, circleMaterial);
        this.selector.visible = false;
        this.selector.rotation.x = degToRad(-90);
        this.scene.add(this.selector);

        this.controller0.add(this.line.clone());

        //this.loadViveControllerModel();
        this.loadOculusControllerModel();
    }

    loadControllerModel() {
        var gamepadModel = 'vive';
        var gamepads = navigator.getGamepads();
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepad.id === 'Oculus Touch (Left)' || gamepad.id === 'Oculus Touch (Right)') {
                gamepadModel = 'oculus';
                break;
            }
        }

        switch (gamepadModel) {
            case 'vive':
                this.loadViveControllerModel();
                break;

            case 'oculus':
                this.loadOculusControllerModel();
                break;
        }
    }

    loadViveControllerModel() {
        let objLoader = new OBJLoader();
        objLoader.setPath(VIVE_PATH);

        let textureLoader = new THREE.TextureLoader();
        textureLoader.setPath(VIVE_PATH);

        loadAll([
            {loader: objLoader, file: OBJ_NAME},
            {loader: textureLoader, file: TEXTURE_NAME},
            {loader: textureLoader, file: SPEC_MAP_NAME}
        ]).then(([object, texture, specMap]) => {
            let controller = object.children[0];
            controller.material.map = texture;
            controller.material.specularMap = specMap;

            this.controller0.add(controller.clone());
            this.controller1.add(controller.clone());
        });
    }

    loadOculusControllerModel() {
        let objLoader = new OBJLoader();
        objLoader.setPath(OCULUS_PATH);

        let textureLoader = new THREE.TextureLoader();
        textureLoader.setPath(OCULUS_PATH);

        loadAll([
            {loader: objLoader, file: OCULUS_LEFT_OBJ},
            {loader: objLoader, file: OCULUS_RIGHT_OBJ},
            {loader: textureLoader, file: OCULUS_TEXTURE_NAME},
            {loader: textureLoader, file: OCULUS_SPEC_MAP_NAME}
        ]).then(([objectLeft, objectRight, texture, specMap]) => {
            let left = objectLeft.children[0];
            left.rotation.x = 45;
            left.position.y = 0.05;
            left.material.map = texture;
            left.material.specularMap = specMap;

            let right = objectRight.children[0];
            right.rotation.x = 45;
            right.position.y = 0.05;
            right.material.map = texture;
            right.material.specularMap = specMap;

            this.controller0.add(left);
            this.controller1.add(right);
        });
    }


    getIntersections(controller) {
        let floor = this.scene.getObjectByName('Floor');

        if (floor) {
            this.tempMatrix.identity().extractRotation(controller.matrixWorld);

            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            return this.raycaster.intersectObjects(floor.children, true);
        }
    }

    update(timestamp) {
        let diff = timestamp - this._last || timestamp;
        this._last = timestamp;
        let intersections = this.getIntersections(this.controller0);

        if (this.tween) {
            let {position} = this.body;
            let {dx, dz, x, z, duration} = this.tween;
            let proportion = diff / duration;
            let moveXBy = dx * proportion;
            let moveZBy = dz * proportion;

            position.x += moveXBy;
            position.z += moveZBy;

            // Stop the tween when it arrives.
            if (
                ((dx >= 0 && position.x >= x || dx <= 0 && position.x <= x)) ||
                    ((dz >= 0 && position.z >= z || dz <= 0 && position.z <= z))
            ) {
                delete this.tween;
            }
        }

        if (intersections && intersections.length > 0) {
            let isTriggerPressed = this.controller0.getButtonState('trigger');
            let intersection = intersections[0];

            if (isTriggerPressed) {
                let {distance, point: {x, z}} = intersection;
                let duration = distance / SPEED;
                let dx = x - this.body.position.x;
                let dz = z - this.body.position.z;

                this.tween = {dx, dz, x, z, duration, ellapsed: 0, traveled: 0};
            } else {
                // Move the selector.
                this.selector.position.copy(intersection.point);
                this.selector.position.y += 0.05;
                this.selector.visible = true;

                // Shorten the line to the point of intersection.
                this.line.scale.z = intersection.distance;
            }
        } else {
            this.selector.visible = true;
            this.line.scale.z = 5;
        }

        this.controller0.update();
        this.controller1.update();
    }
};
