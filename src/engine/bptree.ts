// B+ tree with step-by-step snapshots, following the COMP2605 lecture conventions:
//  * max keys per node = m (lecture order d ⇒ m = 2d; worked example m = 3)
//  * leaf split: left keeps floor((m+1)/2) entries; first key of the right leaf is COPIED up
//  * internal split: left keeps floor((m+1)/2) separators; the next separator is PUSHED up
//  * minimum occupancy: leaves ceil(m/2), internal nodes floor(m/2) separators
//  * deletion: redistribute from the right sibling, then the left; otherwise merge (right first)

export interface BNode { id: number; leaf: boolean; keys: number[]; kids: BNode[] }
export interface Snap { root: BNode; caption: string; hl: number[]; bad: number[]; kind: 'info' | 'warn' | 'ok' }

let nextId = 1
const mk = (leaf: boolean, keys: number[] = [], kids: BNode[] = []): BNode => ({ id: nextId++, leaf, keys, kids })
const clone = (n: BNode): BNode => ({ id: n.id, leaf: n.leaf, keys: [...n.keys], kids: n.kids.map(clone) })

export class BPlusTree {
  root: BNode
  m: number
  snaps: Snap[] = []
  constructor(m: number, root?: BNode) { this.m = m; this.root = root ? clone(root) : mk(true) }

  get leafMin() { return Math.ceil(this.m / 2) }
  get innerMin() { return Math.floor(this.m / 2) }

  private snap(caption: string, hl: BNode[] = [], bad: BNode[] = [], kind: Snap['kind'] = 'info') {
    this.snaps.push({ root: clone(this.root), caption, hl: hl.map((n) => n.id), bad: bad.map((n) => n.id), kind })
  }

  /** Path of nodes from root to the leaf where `k` belongs, plus child indices taken. */
  path(k: number) {
    const nodes: BNode[] = [this.root]
    const idx: number[] = []
    let n = this.root
    while (!n.leaf) {
      let i = 0
      while (i < n.keys.length && k >= n.keys[i]) i++ // equality goes right
      idx.push(i)
      n = n.kids[i]
      nodes.push(n)
    }
    return { nodes, idx }
  }

  search(k: number) {
    this.snaps = []
    const { nodes } = this.path(k)
    nodes.forEach((n, i) => this.snap(i < nodes.length - 1 ? `Page ${i + 1}: compare ${k} with [${n.keys.join(' | ')}] and follow the child whose interval contains ${k}.` : `Page ${i + 1}: leaf [${n.keys.join(' | ')}]: ${n.keys.includes(k) ? `found ${k}; its rid locates the record.` : `${k} is not present.`}`, nodes.slice(0, i + 1), [], i === nodes.length - 1 ? (n.keys.includes(k) ? 'ok' : 'warn') : 'info'))
    return { found: nodes[nodes.length - 1].keys.includes(k), pages: nodes.length, path: nodes.map((n) => [...n.keys]) }
  }

  insert(k: number) {
    this.snaps = []
    const { nodes } = this.path(k)
    const leaf = nodes[nodes.length - 1]
    if (leaf.keys.includes(k)) { this.snap(`${k} is already in the index.`, [leaf], [], 'warn'); return }
    leaf.keys.push(k); leaf.keys.sort((a, b) => a - b)
    if (leaf.keys.length <= this.m) { this.snap(`Insert ${k} into leaf [${leaf.keys.join(' | ')}]. It fits, so no split is needed.`, [leaf], [], 'ok'); return }
    this.snap(`Insert ${k}: leaf [${leaf.keys.join(' | ')}] now has ${leaf.keys.length} entries, more than the maximum ${this.m}. Overflow!`, [leaf], [leaf], 'warn')
    // split leaf
    const L = Math.floor((this.m + 1) / 2)
    const right = mk(true, leaf.keys.slice(L))
    leaf.keys = leaf.keys.slice(0, L)
    let sep = right.keys[0]
    let child: BNode = right
    let level = nodes.length - 2
    this.snap(`Split the leaf into [${leaf.keys.join(' | ')}] and [${right.keys.join(' | ')}]. COPY UP ${sep}: it stays in the right leaf.`, [leaf, right])
    for (;;) {
      if (level < 0) {
        const old = this.root
        this.root = mk(false, [sep], [old, child])
        this.snap(`No parent exists, so create a new root [${sep}]. The tree grows one level taller.`, [this.root], [], 'ok')
        return
      }
      const parent = nodes[level]
      const at = parent.kids.indexOf(level === nodes.length - 2 ? leaf : nodes[level + 1])
      parent.keys.splice(at, 0, sep)
      parent.kids.splice(at + 1, 0, child)
      if (parent.keys.length <= this.m) { this.snap(`Insert separator ${sep} and the new child pointer into parent [${parent.keys.join(' | ')}]. It fits.`, [parent], [], 'ok'); return }
      this.snap(`Parent [${parent.keys.join(' | ')}] now has ${parent.keys.length} separators, more than the maximum ${this.m}. It must split too.`, [parent], [parent], 'warn')
      const Li = Math.floor((this.m + 1) / 2)
      const push = parent.keys[Li]
      const rnode = mk(false, parent.keys.slice(Li + 1), parent.kids.slice(Li + 1))
      parent.keys = parent.keys.slice(0, Li)
      parent.kids = parent.kids.slice(0, Li + 1)
      this.snap(`Split the internal node into [${parent.keys.join(' | ')}] and [${rnode.keys.join(' | ')}]. PUSH UP ${push}: it is kept in neither child.`, [parent, rnode])
      sep = push
      child = rnode
      nodes[level] = parent
      level--
      // the node to locate in the next parent is `parent`
      if (level >= 0) nodes[level + 1] = parent
    }
  }

  delete(k: number) {
    this.snaps = []
    const { nodes, idx } = this.path(k)
    const leaf = nodes[nodes.length - 1]
    if (!leaf.keys.includes(k)) { this.snap(`${k} is not in the index; nothing to delete.`, [leaf], [], 'warn'); return }
    leaf.keys = leaf.keys.filter((x) => x !== k)
    if (leaf === this.root || leaf.keys.length >= this.leafMin) {
      this.snap(`Delete ${k}: leaf [${leaf.keys.join(' | ')}] still has ≥ ${this.leafMin} entries, so no repair is needed. (Separators are routing boundaries and may stay.)`, [leaf], [], 'ok')
      return
    }
    this.snap(`Delete ${k}: leaf [${leaf.keys.join(' | ')}] has fewer than ${this.leafMin} entries. Underflow!`, [leaf], [leaf], 'warn')
    let node = leaf
    let level = nodes.length - 2
    let isLeaf = true
    while (level >= 0) {
      const parent = nodes[level]
      const i = idx[level]
      const right = parent.kids[i + 1], left = parent.kids[i - 1]
      const min = isLeaf ? this.leafMin : this.innerMin
      if (right && right.keys.length > min) {
        if (isLeaf) { node.keys.push(right.keys.shift()!); parent.keys[i] = right.keys[0] }
        else { node.keys.push(parent.keys[i]); parent.keys[i] = right.keys.shift()!; node.kids.push(right.kids.shift()!) }
        this.snap(`Redistribute from the right sibling: ${isLeaf ? `move ${node.keys[node.keys.length - 1]} left` : 'rotate a separator through the parent'}. The parent separator becomes ${parent.keys[i]}.`, [node, right, parent], [], 'ok')
        return
      }
      if (left && left.keys.length > min) {
        if (isLeaf) { node.keys.unshift(left.keys.pop()!); parent.keys[i - 1] = node.keys[0] }
        else { node.keys.unshift(parent.keys[i - 1]); parent.keys[i - 1] = left.keys.pop()!; node.kids.unshift(left.kids.pop()!) }
        this.snap(`Redistribute from the left sibling. The parent separator becomes ${parent.keys[i - 1]}.`, [left, node, parent], [], 'ok')
        return
      }
      // merge
      if (right) {
        if (isLeaf) node.keys = [...node.keys, ...right.keys]
        else { node.keys = [...node.keys, parent.keys[i], ...right.keys]; node.kids = [...node.kids, ...right.kids] }
        const sep = parent.keys[i]
        parent.keys.splice(i, 1); parent.kids.splice(i + 1, 1)
        this.snap(`No sibling can lend, so merge with the right sibling into [${node.keys.join(' | ')}]${isLeaf ? '' : ` (pulling separator ${sep} down)`}. Remove separator ${sep} and one child pointer from the parent.`, [node, parent])
      } else {
        if (isLeaf) left.keys = [...left.keys, ...node.keys]
        else { left.keys = [...left.keys, parent.keys[i - 1], ...node.keys]; left.kids = [...left.kids, ...node.kids] }
        const sep = parent.keys[i - 1]
        parent.keys.splice(i - 1, 1); parent.kids.splice(i, 1)
        this.snap(`No sibling can lend, so merge with the left sibling into [${left.keys.join(' | ')}]. Remove separator ${sep} from the parent.`, [left, parent])
      }
      if (parent === this.root) {
        if (parent.keys.length === 0) {
          this.root = parent.kids[0]
          this.snap('The root has no separators left, so it contracts and its only child becomes the new root. The tree loses a level.', [this.root], [], 'ok')
        }
        return
      }
      if (parent.keys.length >= this.innerMin) { this.snap(`Parent [${parent.keys.join(' | ')}] still meets the minimum of ${this.innerMin} separator${this.innerMin === 1 ? '' : 's'}. Done.`, [parent], [], 'ok'); return }
      this.snap(`Internal node [${parent.keys.join(' | ')}] is below the minimum of ${this.innerMin} separators. Repair it too.`, [parent], [parent], 'warn')
      node = parent
      level--
      isLeaf = false
    }
  }

  leaves(): number[][] {
    const out: number[][] = []
    const walk = (n: BNode) => { if (n.leaf) out.push(n.keys); else n.kids.forEach(walk) }
    walk(this.root)
    return out
  }
  height() { let h = 1, n = this.root; while (!n.leaf) { n = n.kids[0]; h++ } return h }
}

/** The lecture's starting tree for the insert/delete sequence (d = 2, so m = 4). */
export function lectureTree(): BNode {
  const L = (keys: number[]) => mk(true, keys)
  return mk(false, [13, 17, 24, 30], [L([2, 3, 5, 7]), L([14, 16]), L([19, 20, 22]), L([24, 27, 29]), L([33, 34, 38, 39])])
}
/** The tree after inserting 8, used as the start of the deletion sequence. */
export function afterInsert8(): BNode { const t = new BPlusTree(4, lectureTree()); t.insert(8); return t.root }
