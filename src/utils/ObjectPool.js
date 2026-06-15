export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this._createFn = createFn;
    this._resetFn = resetFn;
    this._pool = [];
    for (let i = 0; i < initialSize; i++) {
      this._pool.push(this._createFn());
    }
  }

  acquire() {
    if (this._pool.length > 0) {
      return this._pool.pop();
    }
    return this._createFn();
  }

  release(obj) {
    this._resetFn(obj);
    this._pool.push(obj);
  }

  releaseAll(arr) {
    for (const obj of arr) this.release(obj);
    arr.length = 0;
  }
}
