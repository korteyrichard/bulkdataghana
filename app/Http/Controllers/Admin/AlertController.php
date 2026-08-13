<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Alerts', [
            'alerts' => Alert::latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,success,danger',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:starts_at',
        ]);

        Alert::create($request->only('title', 'message', 'type', 'is_active', 'starts_at', 'expires_at'));

        return redirect()->back()->with('success', 'Alert created successfully.');
    }

    public function update(Request $request, Alert $alert)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,success,danger',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:starts_at',
        ]);

        $alert->update($request->only('title', 'message', 'type', 'is_active', 'starts_at', 'expires_at'));

        return redirect()->back()->with('success', 'Alert updated successfully.');
    }

    public function destroy(Alert $alert)
    {
        $alert->delete();
        return redirect()->back()->with('success', 'Alert deleted successfully.');
    }

    public function toggleActive(Alert $alert)
    {
        $alert->update(['is_active' => !$alert->is_active]);
        return redirect()->back()->with('success', 'Alert status toggled.');
    }
}
