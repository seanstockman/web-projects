export class PairedNumberMap {
    private map = new Map<string, number>();
    private keyMethod: Function;

    constructor(sorted: boolean) {
        this.keyMethod = sorted ? this.getSortedKey : this.getUnsortedKey;
    }

    public set(a: number, b: number, v: number) {
        this.map.set(this.keyMethod(a, b), v);
    }

    public get(a: number, b: number) {
        return this.map.get(this.keyMethod(a, b));
    }

    public delete(a: number, b: number) {
        return this.map.delete(this.keyMethod(a, b));
    }

    private getUnsortedKey(a: number, b: number) {
        return `${a},${b}`;
    }

    private getSortedKey(a: number, b: number) {
        return a < b ? `${a},${b}` : `${b},${a}`;
    }
}