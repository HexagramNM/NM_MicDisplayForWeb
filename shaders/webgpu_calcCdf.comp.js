export default `

@group(0) @binding(0)
var<storage, read> histogram : array<u32>;

@group(0) @binding(1)
var<storage, read_write> cdf : array<u32>;

var<workgroup> temp : array<u32, 256>;

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid : vec3<u32>) {
    let tid = lid.x;

    temp[tid] = histogram[tid];
    workgroupBarrier();

    // upsweep
    var offset = 1u;
    for (var d = 128u; d > 0u; d = d >> 1u) {
        if (tid < d) {
            let ai = offset * (2u * tid + 1u) - 1u;
            let bi = offset * (2u * tid + 2u) - 1u;
            temp[bi] += temp[ai];
        }
        offset = offset << 1u;
        workgroupBarrier();
    }
          
    if (tid == 0u) {
        temp[255] = 0u;
    }
    workgroupBarrier();

    // downsweep
    offset = 128u;
    for (var d = 1u; d < 256u; d = d << 1u) {
        if (tid < d) {
            let ai = offset * (2u * tid + 1u) - 1u;
            let bi = offset * (2u * tid + 2u) - 1u;
            let t = temp[ai];
            temp[ai] = temp[bi];
            temp[bi] += t;
        }
        offset = offset >> 1u;
        workgroupBarrier();
    }

    cdf[tid] = temp[tid] + histogram[tid];
}

`