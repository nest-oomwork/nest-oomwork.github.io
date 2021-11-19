
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.44.2 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let h3;
    	let t5;
    	let img0;
    	let img0_src_value;
    	let t6;
    	let img1;
    	let img1_src_value;
    	let t7;
    	let img2;
    	let img2_src_value;
    	let t8;
    	let img3;
    	let img3_src_value;
    	let t9;
    	let img4;
    	let img4_src_value;
    	let t10;
    	let img5;
    	let img5_src_value;
    	let t11;
    	let img6;
    	let img6_src_value;
    	let t12;
    	let img7;
    	let img7_src_value;
    	let t13;
    	let img8;
    	let img8_src_value;
    	let t14;
    	let img9;
    	let img9_src_value;
    	let t15;
    	let img10;
    	let img10_src_value;
    	let t16;
    	let h4;
    	let t18;
    	let img11;
    	let img11_src_value;
    	let t19;
    	let img12;
    	let img12_src_value;
    	let t20;
    	let img13;
    	let img13_src_value;
    	let t21;
    	let img14;
    	let img14_src_value;
    	let t22;
    	let img15;
    	let img15_src_value;
    	let t23;
    	let img16;
    	let img16_src_value;
    	let t24;
    	let img17;
    	let img17_src_value;
    	let t25;
    	let img18;
    	let img18_src_value;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "A B C";
    			t1 = space();
    			p = element("p");
    			p.textContent = "สวัสดีชาวโลกฉันชื่อ พีรดา พรหมนารท อยู่ โรงเรียนไตรพัฒน์มานานเเสนนาน โชคดีอย่างนึงที่ฉันเป็นคนที่ค่อนข้างจะรู้ตัวเองว่าชอบอะไรบ้างเเละได้ลงมือทำอย่างจริงจังกับอะไรหลายๆอย่างตั้งเเต่เด็ก 2สิ่งหลักๆเลยคือ 1 การวาดรูป 2 การขี่ม้า สายงานทั้งสองอย่างนี้เป็น2อย่างที่มีจุดเริ่มต้นที่เเเตกต่างกัน การวาดรูปเป็นสิ่งที่ฝึกฝนด้วยตัวเองเพราะเเค่อยากทำให้ออกมาดีเท่ากับเพื่อนคนอื่นๆ พอเริ่มทำได้ดีก็เลยอย่างทำได้ดีขึ้นเเละดีขึ้น ส่วนเรื่องการขี่ม้าพ่อเป็นคนพาให้ไปลองเเล้วฉันเกิดชอบเเละหลงรักมันมากๆ กีฬาขี่ม้าในช่วงชีวิตนึงเเทบจะเป็นทุกอย่างของหนูเลยเพราะในทุกๆวันก็จะมีเเตการฝ฿กฝนเเละเรียนรู้อยู่เสมอเเล้วมันก็สอนหลายๆอย่างให้กับหนูเช่น สมาธิ การตื่นตัว ความตั้งใจ ความอดทน เเละการไม่ยอมเเพ้ เเละถึงเเม้ว่ากีฬานี้จะทำให้ฉันเจ็บตัวเเละเคยชินกับอุบัติเหตุเป็นประจำถึงอย่างไรก็ตามฉันก็ยังไม่เคยคิดที่จะเลิกกลับไปฝึกฝนอีกครั้งยู่ดี";
    			t3 = space();
    			h3 = element("h3");
    			h3.textContent = "ต่อไปจะเป็นตัวอย่างภาพเล็กๆน้อยๆนะคะ";
    			t5 = space();
    			img0 = element("img");
    			t6 = space();
    			img1 = element("img");
    			t7 = space();
    			img2 = element("img");
    			t8 = space();
    			img3 = element("img");
    			t9 = space();
    			img4 = element("img");
    			t10 = space();
    			img5 = element("img");
    			t11 = space();
    			img6 = element("img");
    			t12 = space();
    			img7 = element("img");
    			t13 = space();
    			img8 = element("img");
    			t14 = space();
    			img9 = element("img");
    			t15 = space();
    			img10 = element("img");
    			t16 = space();
    			h4 = element("h4");
    			h4.textContent = "ขี่ม้า";
    			t18 = space();
    			img11 = element("img");
    			t19 = space();
    			img12 = element("img");
    			t20 = space();
    			img13 = element("img");
    			t21 = space();
    			img14 = element("img");
    			t22 = space();
    			img15 = element("img");
    			t23 = space();
    			img16 = element("img");
    			t24 = space();
    			img17 = element("img");
    			t25 = space();
    			img18 = element("img");
    			attr_dev(h1, "class", "svelte-12fbzcr");
    			add_location(h1, file, 5, 1, 30);
    			add_location(p, file, 6, 1, 47);
    			attr_dev(h3, "class", "svelte-12fbzcr");
    			add_location(h3, file, 7, 1, 873);
    			if (!src_url_equal(img0.src, img0_src_value = "image/art/4.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "width", "500");
    			add_location(img0, file, 8, 1, 920);
    			if (!src_url_equal(img1.src, img1_src_value = "image/art/5.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "width", "500");
    			add_location(img1, file, 9, 1, 969);
    			if (!src_url_equal(img2.src, img2_src_value = "image/art/6.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			attr_dev(img2, "width", "500");
    			add_location(img2, file, 10, 1, 1018);
    			if (!src_url_equal(img3.src, img3_src_value = "image/art/8.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			attr_dev(img3, "width", "500");
    			add_location(img3, file, 11, 1, 1067);
    			if (!src_url_equal(img4.src, img4_src_value = "image/art/9.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "width", "500");
    			add_location(img4, file, 12, 1, 1116);
    			if (!src_url_equal(img5.src, img5_src_value = "image/art/10.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			attr_dev(img5, "width", "500");
    			add_location(img5, file, 13, 1, 1165);
    			if (!src_url_equal(img6.src, img6_src_value = "image/art/11.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			attr_dev(img6, "width", "500");
    			add_location(img6, file, 14, 1, 1215);
    			if (!src_url_equal(img7.src, img7_src_value = "image/art/12.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			attr_dev(img7, "width", "500");
    			add_location(img7, file, 15, 1, 1265);
    			if (!src_url_equal(img8.src, img8_src_value = "image/art/13.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			attr_dev(img8, "width", "500");
    			add_location(img8, file, 16, 1, 1315);
    			if (!src_url_equal(img9.src, img9_src_value = "image/art/14.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			attr_dev(img9, "width", "500");
    			add_location(img9, file, 17, 1, 1365);
    			if (!src_url_equal(img10.src, img10_src_value = "image/art/15.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "");
    			attr_dev(img10, "width", "500");
    			add_location(img10, file, 18, 1, 1415);
    			add_location(h4, file, 19, 1, 1465);
    			if (!src_url_equal(img11.src, img11_src_value = "image/hores/im1.jpg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			attr_dev(img11, "width", "500");
    			add_location(img11, file, 20, 1, 1482);
    			if (!src_url_equal(img12.src, img12_src_value = "image/hores/im2.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			attr_dev(img12, "width", "500");
    			add_location(img12, file, 21, 1, 1535);
    			if (!src_url_equal(img13.src, img13_src_value = "image/hores/im3.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "alt", "");
    			attr_dev(img13, "width", "500");
    			add_location(img13, file, 22, 1, 1588);
    			if (!src_url_equal(img14.src, img14_src_value = "image/hores/im4.jpg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "");
    			attr_dev(img14, "width", "500");
    			add_location(img14, file, 23, 1, 1641);
    			if (!src_url_equal(img15.src, img15_src_value = "image/hores/im5.jpg")) attr_dev(img15, "src", img15_src_value);
    			attr_dev(img15, "alt", "");
    			attr_dev(img15, "width", "500");
    			add_location(img15, file, 24, 1, 1694);
    			if (!src_url_equal(img16.src, img16_src_value = "image/hores/im6.jpg")) attr_dev(img16, "src", img16_src_value);
    			attr_dev(img16, "alt", "");
    			attr_dev(img16, "width", "500");
    			add_location(img16, file, 25, 1, 1747);
    			if (!src_url_equal(img17.src, img17_src_value = "image/hores/im7.jpg")) attr_dev(img17, "src", img17_src_value);
    			attr_dev(img17, "alt", "");
    			attr_dev(img17, "width", "500");
    			add_location(img17, file, 26, 1, 1800);
    			if (!src_url_equal(img18.src, img18_src_value = "image/hores/im8.jpg")) attr_dev(img18, "src", img18_src_value);
    			attr_dev(img18, "alt", "");
    			attr_dev(img18, "width", "500");
    			add_location(img18, file, 27, 1, 1853);
    			attr_dev(main, "class", "svelte-12fbzcr");
    			add_location(main, file, 4, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, p);
    			append_dev(main, t3);
    			append_dev(main, h3);
    			append_dev(main, t5);
    			append_dev(main, img0);
    			append_dev(main, t6);
    			append_dev(main, img1);
    			append_dev(main, t7);
    			append_dev(main, img2);
    			append_dev(main, t8);
    			append_dev(main, img3);
    			append_dev(main, t9);
    			append_dev(main, img4);
    			append_dev(main, t10);
    			append_dev(main, img5);
    			append_dev(main, t11);
    			append_dev(main, img6);
    			append_dev(main, t12);
    			append_dev(main, img7);
    			append_dev(main, t13);
    			append_dev(main, img8);
    			append_dev(main, t14);
    			append_dev(main, img9);
    			append_dev(main, t15);
    			append_dev(main, img10);
    			append_dev(main, t16);
    			append_dev(main, h4);
    			append_dev(main, t18);
    			append_dev(main, img11);
    			append_dev(main, t19);
    			append_dev(main, img12);
    			append_dev(main, t20);
    			append_dev(main, img13);
    			append_dev(main, t21);
    			append_dev(main, img14);
    			append_dev(main, t22);
    			append_dev(main, img15);
    			append_dev(main, t23);
    			append_dev(main, img16);
    			append_dev(main, t24);
    			append_dev(main, img17);
    			append_dev(main, t25);
    			append_dev(main, img18);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
