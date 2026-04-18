export default `

@group(0) @binding(0)
var inputTexture : texture_2d<f32>;

@group(0) @binding(1)
var maskTexture : texture_2d<f32>;

@group(0) @binding(2)
var smp : sampler;

@group(0) @binding(3)
var<uniform> isMirror : u32;

@group(0) @binding(4)
var<uniform> canvasSize : vec2<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>
    ) -> @location(0) vec4<f32> {
    
    var uv = pos.xy / canvasSize;
    if (isMirror != 0u) {
        uv.x = 1.0 - uv.x;
    }
    
    let color = textureSample(inputTexture, smp, uv);
    let maskColor = textureSample(maskTexture, smp, uv);
    
    return vec4<f32>(color.rgb, color.a * maskColor.a);
}

`